// Addresses used by automated tests / internal QA — never emailed, never shown in the CRM.
export const isTestEmail = (e: string): boolean =>
  /[@.]example(\.|$)|@test\.|^(e1-?test|pytest)|^(cs-|test-)[^@]*@ownology\.ai$|^[^@]*-test@ownology\.ai$/.test(e.trim().toLowerCase());
