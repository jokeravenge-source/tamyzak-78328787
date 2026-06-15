export interface EnglishEssayTopic {
  id: string;
  title: string;
  titleAr: string;
  hint: string;
}

// Common ministerial English composition topics for Iraqi 6th grade.
// The user can later upload a PDF to extend / replace this list.
export const englishEssayTopics: EnglishEssayTopic[] = [
  { id: "hobby",      title: "My Hobby",                       titleAr: "هوايتي",                       hint: "What hobby you like, why, how often, benefits." },
  { id: "internet",   title: "The Internet",                   titleAr: "الإنترنت",                     hint: "Uses, advantages, disadvantages, your opinion." },
  { id: "pollution",  title: "Pollution",                      titleAr: "التلوث",                       hint: "Types, causes, effects, solutions." },
  { id: "smoking",    title: "Smoking and Its Dangers",        titleAr: "التدخين وأضراره",              hint: "Reasons people smoke, health effects, how to stop." },
  { id: "education",  title: "The Importance of Education",    titleAr: "أهمية التعليم",                hint: "Why education matters, role in society, your goals." },
  { id: "family",     title: "My Family",                      titleAr: "عائلتي",                       hint: "Members, what they do, family values, activities." },
  { id: "friend",     title: "My Best Friend",                 titleAr: "صديقي المفضل",                 hint: "Name, personality, why best friend, shared memories." },
  { id: "summer",     title: "Summer Holiday",                 titleAr: "العطلة الصيفية",               hint: "Where you go, what you do, why you enjoy it." },
  { id: "city",       title: "My City",                        titleAr: "مدينتي",                       hint: "Location, places, people, what you like about it." },
  { id: "school",     title: "My School",                      titleAr: "مدرستي",                       hint: "Description, teachers, subjects, daily routine." },
  { id: "iraq",       title: "Iraq",                           titleAr: "العراق",                       hint: "Location, history, civilization, culture, people." },
  { id: "ramadan",    title: "The Holy Month of Ramadan",      titleAr: "شهر رمضان المبارك",            hint: "Fasting, prayers, social meaning, traditions." },
  { id: "sport",      title: "My Favorite Sport",              titleAr: "رياضتي المفضلة",               hint: "What sport, why, benefits, when you practice." },
  { id: "tv",         title: "Television",                     titleAr: "التلفاز",                      hint: "Programs, advantages, disadvantages, balance." },
  { id: "books",      title: "The Importance of Reading",      titleAr: "أهمية القراءة",                hint: "Benefits, types of books, your reading habits." },
  { id: "job",        title: "My Future Job",                  titleAr: "وظيفتي في المستقبل",           hint: "Which job, why, how to prepare for it." },
  { id: "health",     title: "Health is Wealth",               titleAr: "الصحة كنز",                    hint: "Healthy food, sport, sleep, avoiding bad habits." },
  { id: "water",      title: "The Importance of Water",        titleAr: "أهمية الماء",                  hint: "Uses, saving water, water pollution." },
  { id: "mother",     title: "My Mother",                      titleAr: "أمي",                          hint: "Her qualities, her role, your feelings." },
  { id: "covid",      title: "COVID-19 and Its Effects",       titleAr: "كوفيد-19 وتأثيراته",           hint: "What is it, prevention, social and economic effects." },
];