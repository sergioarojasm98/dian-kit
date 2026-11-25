---
"@dian-kit/core": patch
---

Runtime dependency floors past their security advisories: node-forge ^1.4.4 (RSA PKCS#1 v1.5 signature forgery,
PKCS#12 MAC forgery, ASN.1/PEM denial of service), @xmldom/xmldom ^0.8.15 (XML injection through serialization,
quadratic parsing) and zod ^4.6.7 (memory exhaustion). Installing this version can no longer resolve a vulnerable
one. No API change.
