export type TranslationTree = {
  meta: { siteTitle: string };
  brand: {
    wordmarkAmharic: string;
    wordmarkLatin: string;
    descriptor: string;
  };
  nav: {
    home: string;
    browse: string;
    myReports: string;
    about: string;
    signIn: string;
    openMenu: string;
    closeMenu: string;
    primary: string;
  };
  language: {
    label: string;
    en: string;
    am: string;
  };
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: string;
  };
  actions: {
    lostTitle: string;
    lostDescription: string;
    foundTitle: string;
    foundDescription: string;
  };
  trust: {
    secureTitle: string;
    secureBody: string;
    communityTitle: string;
    communityBody: string;
    verifiedTitle: string;
    verifiedBody: string;
    saferTitle: string;
    saferBody: string;
  };
  recent: {
    eyebrow: string;
    viewAll: string;
    viewDetails: string;
    locationPrefix: string;
    empty: string;
    mockNote: string;
  };
  placeholders: {
    browseTitle: string;
    browseBody: string;
    reportsTitle: string;
    reportsBody: string;
    aboutTitle: string;
    aboutBody: string;
    signInTitle: string;
    signInBody: string;
    lostTitle: string;
    lostBody: string;
    foundTitle: string;
    foundBody: string;
    itemTitle: string;
    itemBody: string;
    backHome: string;
  };
};

export const en: TranslationTree = {
  meta: {
    siteTitle: "Tefabign — Campus Lost & Found",
  },
  brand: {
    wordmarkAmharic: "ጠፋብኝ",
    wordmarkLatin: "TEFABIGN",
    descriptor: "Campus Lost & Found",
  },
  nav: {
    home: "Home",
    browse: "Browse Items",
    myReports: "My Reports",
    about: "About",
    signIn: "Sign In",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    primary: "Primary",
  },
  language: {
    label: "Language",
    en: "EN",
    am: "አማ",
  },
  hero: {
    eyebrow: "Your campus. One place.",
    titleLine1: "Lost something?",
    titleLine2: "Let’s find it.",
    subtitle:
      "Report lost items, find what’s been found, and get your belongings back — safely.",
  },
  actions: {
    lostTitle: "I Lost Something",
    lostDescription: "Report a missing item",
    foundTitle: "I Found Something",
    foundDescription: "Help return an item",
  },
  trust: {
    secureTitle: "Secure",
    secureBody: "Your information stays protected",
    communityTitle: "Community Driven",
    communityBody: "Students help students",
    verifiedTitle: "Verified Returns",
    verifiedBody: "Ownership checks, staff approval",
    saferTitle: "A Safer Campus",
    saferBody: "Together we keep our campus safe",
  },
  recent: {
    eyebrow: "Recently found",
    viewAll: "View all items",
    viewDetails: "View details",
    locationPrefix: "Found near",
    empty: "No public found items to show yet.",
    mockNote: "Preview items for layout — replace with live public search data.",
  },
  placeholders: {
    browseTitle: "Browse Items",
    browseBody: "Public search will connect to the backend browse experience here.",
    reportsTitle: "My Reports",
    reportsBody: "Your lost and found reports will appear here after sign-in.",
    aboutTitle: "About Tefabign",
    aboutBody:
      "Tefabign helps campus communities report lost and found items, verify ownership, and return belongings safely with staff oversight.",
    signInTitle: "Sign In",
    signInBody: "Authentication UI will connect to the existing backend auth API.",
    lostTitle: "Report a lost item",
    lostBody: "The lost-item reporting form will live on this route.",
    foundTitle: "Report a found item",
    foundBody: "The found-item reporting form will live on this route.",
    itemTitle: "Item details",
    itemBody: "Public-safe item details will appear here.",
    backHome: "Back to home",
  },
};
