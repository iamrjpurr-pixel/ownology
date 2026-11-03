// True only for real in-person events (not lead sources like directories or YouTube).
export const isRealEvent = (event: string | null | undefined): event is string =>
  !!event && !/directory|naked wines|youtube|podcast|article|research|website|instagram|linkedin|google|referral/i.test(event);
