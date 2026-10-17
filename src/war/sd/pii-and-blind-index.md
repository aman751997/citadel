---
title: "PII, crypto and blind indexes"
description: "How to search data that is encrypted: field-level encryption, blind indexes, and why changing keys is costly."
order: 12
minutes: 7
---

**The prompt this answers:** *"Patient names must be encrypted at rest. The front desk needs to
search by name. Both. Go."*

This is a hard question with a real answer, and almost nobody has one ready. It's the best single
item on this site for a security-flavoured round.

A few terms first. **PII** means personally identifiable information: names, phone numbers, dates
of birth. **Encryption at rest** means the database stores scrambled data, not the real values.
The scrambled form is called **ciphertext**. The real value is the **plaintext**.

## The contradiction

**The problem.** The front desk types "Aman" and expects to see the patient. But the name is
stored as ciphertext. The database cannot match "Aman" against scrambled bytes.

It gets worse, and it is deliberate. Good encryption gives a different ciphertext every time, even
for the same input. Take **AES-GCM**, a standard encryption mode. It also detects tampering. Each
time it encrypts, it mixes in a fresh random number called a **nonce** (also called an IV). So two
patients named "Aman" get two different ciphertexts.

That is the whole point. If the same plaintext gave the same ciphertext, an attacker could count
repeats and guess values. That attack is called **frequency analysis**. For example, the most common
ciphertext in a name column is probably a very common name.

So this is what breaks:
- `WHERE name = 'Aman'` → no match, ever.
- `WHERE name LIKE 'Am%'` → meaningless, ciphertext prefixes carry no plaintext relationship.
- An index on the column is useless for anything but exact-ciphertext lookup.

So: how do you look someone up?

## Layer 1 — transparent field encryption

**The problem.** If every developer has to remember to encrypt each sensitive field, someone will
forget.

**The fix.** Use **field-level encryption**: encrypt single columns, not the whole database. An
ORM attribute converter does it for you. It encrypts on write and decrypts on read, so entity code
never sees ciphertext:

```java
@Converter
public class EncryptedStringConverter implements AttributeConverter<String,String> {
    public String convertToDatabaseColumn(String v) { return crypto().encrypt(v); }
    public String convertToEntityAttribute(String v) { return crypto().decrypt(v); }
}
```

Applied per field with `@Convert`. The cipher is **AES-256-GCM**. It is authenticated encryption,
so if someone changes the ciphertext, decryption fails loudly. It does not quietly return garbage.

**Trade-off to state:** transparent means developers can't forget it. It also means they can't
*see* it. Nobody notices a column has become unsearchable until the search ticket arrives.

## Layer 2 — a vault for the most sensitive fields

**The problem.** Even encrypted, name and date of birth sitting in every service's database is a
big target. Deleting a person's data on request would mean touching all of those services.

**The fix.** Name, contact and date of birth don't live in the service database at all. They go to
a separate compliance service, which returns a **vault ID**. The patient row stores only that ID.

Think of a cloakroom ticket. The ticket alone tells you nothing about the coat.

**Why a second tier:** it separates the data from the service that uses it. If the patient service
is compromised, the attacker gets identifiers, not identities. It also puts retention and
data-subject-deletion in one place. Delete the vault entry and every referencing row is
de-identified at once. That is the only sane way to implement "right to erasure" across 22
services.

**Cost:** a remote call in the registration path. And, as the
[compensation story](/citadel/lld/war/patterns-why/) (entry 11) shows, it is a side effect that
`@Transactional` cannot undo.

## Layer 3 — the blind index (the actual answer)

**The problem.** The data is encrypted, and random encryption can't be searched. We still need
search.

**The fix.** Store a second value next to the ciphertext: a **keyed hash** of the plaintext. Then
search by that hash.

A hash is a one-way scramble. The same input always gives the same output, and you can't turn it
back into the input. **HMAC** is a hash that also needs a secret key. Without the key, nobody can
compute it. This hash-for-searching is called a **blind index**.

Think of a fingerprint. You can match two fingerprints without ever seeing the face.

**Exact match** is easy: `phoneSearchHash = HMAC(key, normalise(phone))`. ("Normalise" means clean
it first: lower-case, strip spaces, and so on, so the same value always hashes the same.) To search,
compute the same HMAC of what the user typed. That finds one row, through a normal index, with no
decryption.

**Prefix search is the interesting part.** The front desk types "am" and expects "Aman". But
`LIKE 'am%'` can't work on a hash, because hashing destroys the "starts with" structure. So the
system **lists every prefix at write time** and stores a hash of each one in a lookup table:

```java
// for the normalised full name AND for each word in it:
for (int i = minLength; i <= s.length(); i++) {
    prefixes.add(s.substring(0, i));
}
// then HMAC each prefix under a TENANT-SCOPED key
hashes.add(hmacPrefix(tenantKey, prefix));
```

"Aman Singh" therefore stores hashes for `aman`, `amans`, …, plus `sing`, `singh`. A search for
`"aman"` becomes an **exact-match lookup on one hash**, which an index can serve.

Three design decisions in that snippet are worth naming:

1. **A minimum prefix length.** Without it, single-character prefixes match a huge share of rows
   and leak information about how the data is spread.
2. **Per-word prefixes as well as whole-string.** So "Singh" finds the patient, not just "Aman".
   That's a product requirement driving a crypto design.
3. **A tenant-scoped key.** A tenant is one customer, here one hospital. The same name at two
   hospitals produces **different** hashes. An attacker with the whole table cannot link patients
   across tenants. And if one tenant's key is compromised, it doesn't unlock another's.

**Why this (and not the obvious alternative).** The obvious fix is to make encryption predictable,
so the same input always gives the same output. That is called **deterministic encryption**, as
opposed to the random kind above. Then plain equality search works. But it leaks equality across
the whole value. And you still can't do prefix search. A blind index keeps the real encryption
random and puts the searchable part in a separate, keyed hash.

## What you must volunteer about blind indexes

An interviewer who knows this area will push here. Having the answer ready is the whole value.

- **A blind index leaks equality.** Identical plaintext → identical hash. An attacker who dumps the
  table learns *which rows share a name* even without learning the name. If they also have the
  key, they can confirm a guess by computing its hash. That's the accepted cost of searchability.
- **Storage amplification.** One name becomes ~10–20 hash rows. You pay for prefix search with
  extra work at write time and extra disk.
- **Rotation is expensive.** **Key rotation** means replacing a key with a new one on a schedule,
  or after a leak. For a blind index, a new key means recomputing every hash. The system tags
  hashes with a key version (`keyVersion`), so rotation can be done in stages, not all at once.
- **It does not support** substring search (`%man%`), fuzzy match, or sorting by name. If the
  product needs those, you need a different tool. Options are a searchable-encryption scheme, which
  has real trade-offs, or a separately-secured search index.

## Answering it in an interview

**Say this in the interview:** *"Proper encryption destroys searchability on purpose. So I keep the
encryption random and add a keyed-hash blind index for search. Then I tell you what it leaks."*

Walk through it in this order:

1. State the contradiction: proper encryption destroys searchability, *by design*.
2. Reject the tempting wrong answers out loud:
   - Deterministic encryption. It leaks equality on the whole value. It also reflects ECB-style
     thinking. ECB is an old cipher mode that always turns the same block into the same output, so
     patterns show through.
   - Decrypting and filtering in the application. That is a full table scan with every record in
     memory.
3. Present the blind index: keyed hash for equality, enumerated prefix hashes for prefix search.
4. **Volunteer the leak.** Equality leakage is built in. Saying so unprompted is what separates
   someone who has designed this from someone who has read about it.
5. Mention key scoping (per-tenant) and versioning (for rotation).

**Sketch:**

```
write:  name ──┬─→ AES-256-GCM ──────────────→ patient.name_encrypted
               └─→ prefixes ─→ HMAC(tenantKey) → name_prefix_hash (lookup table)

read:   "aman" ─→ HMAC(tenantKey) ─→ index lookup ─→ patient ids ─→ decrypt for display
```
