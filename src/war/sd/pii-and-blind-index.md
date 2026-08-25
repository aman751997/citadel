---
title: "PII, crypto and blind indexes"
description: "Search over encrypted data — field-level crypto, blind indexes, and what key rotation really costs."
order: 12
minutes: 10
---

**The prompt this answers:** *"Patient names must be encrypted at rest. The front desk needs to
search by name. Both. Go."*

This is a genuinely hard question with a real answer, and almost nobody has one ready. It's the
best single item on this site for a security-flavoured round.

## The contradiction

Encryption at rest means the database stores ciphertext. Two patients named "Aman" produce
**different** ciphertext under a proper AES-GCM scheme, because GCM uses a random nonce. That's
the point — identical plaintext must not produce identical ciphertext, or you've built a
frequency-analysis oracle.

But it means:
- `WHERE name = 'Aman'` → no match, ever.
- `WHERE name LIKE 'Am%'` → meaningless, ciphertext prefixes carry no plaintext relationship.
- An index on the column is useless for anything but exact-ciphertext lookup.

So: how do you look someone up?

## Layer 1 — transparent field encryption

An ORM attribute converter encrypts on write and decrypts on read, so entity code never sees
ciphertext:

```java
@Converter
public class EncryptedStringConverter implements AttributeConverter<String,String> {
    public String convertToDatabaseColumn(String v) { return crypto().encrypt(v); }
    public String convertToEntityAttribute(String v) { return crypto().decrypt(v); }
}
```

Applied per field with `@Convert`. **AES-256-GCM** — authenticated encryption, so tampering with
the ciphertext is detected rather than silently decrypting to garbage.

**Trade-off to state:** transparent means developers can't forget it. It also means they can't
*see* it, so nobody notices they've made a column unsearchable until the search ticket arrives.

## Layer 2 — a vault for the most sensitive fields

Name, contact and date of birth don't live in the service database at all. They go to a separate
compliance service, which returns a **vault ID**, and the patient row stores only that ID.

**Why a second tier:** it separates the data from the service that uses it, so a compromise of the
patient service yields identifiers rather than identities. It also puts retention and
data-subject-deletion in one place — delete the vault entry and every referencing row is
de-identified at once, which is the only sane way to implement "right to erasure" across 22
services.

**Cost:** a remote call in the registration path, and — as the
[compensation story](/citadel/war/lld/patterns-why/) (entry 11) shows — a side effect that
`@Transactional` cannot undo.

## Layer 3 — the blind index (the actual answer)

To search, store a **keyed hash** alongside the ciphertext, and search the hash.

**Exact match** is easy: `phoneSearchHash = HMAC(key, normalise(phone))`. Look up by computing the
same HMAC of the search term. One row, indexed, no decryption.

**Prefix search is the interesting part.** `LIKE 'am%'` can't work on a hash — hashes destroy
prefix structure. So the system **enumerates the prefixes at write time** and stores a hash of
each in a lookup table:

```java
// for the normalised full name AND for each word in it:
for (int i = minLength; i <= s.length(); i++) {
    prefixes.add(s.substring(0, i));
}
// then HMAC each prefix under a TENANT-SCOPED key
hashes.add(hmacPrefix(tenantKey, prefix));
```

"Aman Singh" therefore stores hashes for `aman`, `amans`, …, plus `sing`, `singh` — so a search
for `"aman"` becomes an **exact-match lookup on one hash**, which an index can serve.

Three design decisions in that snippet worth naming:

1. **A minimum prefix length.** Without it, single-character prefixes match a huge share of rows
   and leak distribution information.
2. **Per-word prefixes as well as whole-string.** So "Singh" finds the patient, not just "Aman".
   That's a product requirement driving a crypto design.
3. **A tenant-scoped key.** The same name at two hospitals produces **different** hashes, so an
   attacker with the whole table cannot correlate patients across tenants, and one tenant's
   compromised key doesn't unlock another's.

## What you must volunteer about blind indexes

An interviewer who knows this area will push here, and having the answer ready is the whole value:

- **A blind index leaks equality.** Identical plaintext → identical hash. An attacker who dumps the
  table learns *which rows share a name* even without learning the name — and can confirm a guess
  by computing its hash (if they have the key). That's the accepted cost of searchability.
- **Storage amplification.** One name becomes ~10–20 hash rows. Prefix search is bought with
  write-time work and disk.
- **Rotation is expensive.** Changing the key means recomputing every hash. The system versions
  keys (`keyVersion`) so rotation can be staged rather than big-bang.
- **It does not support** substring search (`%man%`), fuzzy match, or sorting by name. If the
  product needs those, you need a different tool — a searchable-encryption scheme with real
  trade-offs, or a separately-secured search index.

## Answering it in an interview

1. State the contradiction: proper encryption destroys searchability, *by design*.
2. Reject the tempting wrong answers out loud: deterministic encryption (equality-leaking on the
   whole value, and ECB-shaped thinking), or decrypting-and-filtering in the application (a full
   table scan and every record in memory).
3. Present the blind index: keyed hash for equality, enumerated prefix hashes for prefix search.
4. **Volunteer the leak.** Equality leakage is intrinsic. Saying so unprompted is what separates
   someone who has designed this from someone who has read about it.
5. Mention key scoping (per-tenant) and versioning (for rotation).

**Sketch:**

```
write:  name ──┬─→ AES-256-GCM ──────────────→ patient.name_encrypted
               └─→ prefixes ─→ HMAC(tenantKey) → name_prefix_hash (lookup table)

read:   "aman" ─→ HMAC(tenantKey) ─→ index lookup ─→ patient ids ─→ decrypt for display
```
