# Migration: RTLX 15.9.7 to 15.9.8

No settings or storage migration is required.

Replace the installed build with the matching 15.9.8 browser artifact. Existing settings, site profiles, permissions, and runtime behavior remain compatible.

For release engineering, add the structured-clone guard and retain the new exact-artifact JSON evidence files. Do not claim runtime verification for a target whose evidence is not `pass`.
