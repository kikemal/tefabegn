import { dashboardAm } from "./dashboard.am";
import type { TranslationTree } from "./en";

export const am = {
  meta: {
    siteTitle: "ጠፋብኝ — የካምፓስ ጠፍቶ የተገኘ",
  },
  brand: {
    wordmarkAmharic: "ጠፋብኝ",
    wordmarkLatin: "TEFABIGN",
    descriptor: "የካምፓስ ጠፍቶ የተገኘ",
  },
  dash: dashboardAm,
  nav: {
    home: "መነሻ",
    browse: "እቃዎችን አስስ",
    myReports: "የእኔ ሪፖርቶች",
    about: "ስለ እኛ",
    signIn: "ግባ",
    openMenu: "ሜኑ ክፈት",
    closeMenu: "ሜኑ ዝጋ",
    primary: "ዋና",
  },
  language: {
    label: "ቋንቋ",
    en: "EN",
    am: "አማ",
  },
  theme: {
    switchToLight: "ወደ ብርሃን ገጽታ ቀይር",
    switchToDark: "ወደ ጨለማ ገጽታ ቀይር",
  },
  hero: {
    eyebrow: "የእርስዎ ካምፓስ። አንድ ቦታ።",
    titleLine1: "አንድ ነገር ጠፍቷል?",
    titleLine2: "እንፈልገው።",
    subtitle: "የጠፉ እቃዎችን ሪፖርት ያድርጉ፣ የተገኙትን ያግኙ፣ እና ንብረትዎን በደህንነት ይመልሱ።",
  },
  actions: {
    lostTitle: "አንድ ነገር ጠፍቷል",
    lostDescription: "የጠፋ እቃ ሪፖርት ያድርጉ",
    foundTitle: "አንድ ነገር አግኝቻለሁ",
    foundDescription: "እቃ ለመመለስ ያግዙ",
  },
  trust: {
    secureTitle: "ደህንነት",
    secureBody: "መረጃዎ የተጠበቀ ነው",
    communityTitle: "በማህበረሰብ የሚመራ",
    communityBody: "ተማሪዎች ተማሪዎችን ይረዳሉ",
    verifiedTitle: "የተረጋገጠ መመለስ",
    verifiedBody: "የባለቤትነት ማረጋገጫ እና የሰራተኛ ፈቃድ",
    saferTitle: "ደህንነቱ የተጠበቀ ካምፓስ",
    saferBody: "አብረን ካምፓሳችንን ደህንነቱ የተጠበቀ እናደርጋለን",
  },
  recent: {
    eyebrow: "በቅርቡ የተገኙ",
    viewAll: "እቃዎችን ለማስስ ይግቡ",
    viewDetails: "እቃዎችን ለማየት ይግቡ",
    locationPrefix: "የተገኘበት",
    empty: "እስካሁን የሚታይ የተገኘ እቃ የለም።",
    mockNote:
      "ለቅድመ እይታ ብቻ — የቀጥታ የካምፓስ መረጃ አይደለም። ያለ መግባት የህዝብ የተገኙ እቃዎች ዝርዝር እስካሁን አይገኝም።",
  },
  placeholders: {
    browseTitle: "እቃዎችን አስስ",
    browseBody: "የህዝብ ፍለጋ ከኋላኛ ክፍል ጋር እዚህ ይገናኛል።",
    reportsTitle: "የእኔ ሪፖርቶች",
    reportsBody: "ከገቡ በኋላ የጠፉ እና የተገኙ ሪፖርቶችዎ እዚህ ይታያሉ።",
    aboutTitle: "ስለ ጠፋብኝ",
    aboutBody:
      "ጠፋብኝ የካምፓስ ማህበረሰቦች የጠፉ እና የተገኙ እቃዎችን እንዲሪፖርቱ፣ ባለቤትነት እንዲያረጋግጡ እና በሰራተኛ ክትትል በደህንነት እንዲመልሱ ይረዳል።",
    signInTitle: "ግባ",
    signInBody: "የመግቢያ ገጹ ከነባሩ የኋላኛ ክፍል ማረጋገጫ ኤፒአይ ጋር ይገናኛል።",
    lostTitle: "የጠፋ እቃ ሪፖርት",
    lostBody: "የጠፋ እቃ ሪፖርት ቅጽ በዚህ መንገድ ላይ ይኖራል።",
    foundTitle: "የተገኘ እቃ ሪፖርት",
    foundBody: "የተገኘ እቃ ሪፖርት ቅጽ በዚህ መንገድ ላይ ይኖራል።",
    itemTitle: "የእቃ ዝርዝር",
    itemBody: "ለህዝብ ደህንነቱ የተጠበቀ የእቃ ዝርዝር እዚህ ይታያል።",
    backHome: "ወደ መነሻ ተመለስ",
  },
} satisfies TranslationTree;
