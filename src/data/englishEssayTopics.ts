export interface EnglishEssayTopic {
  id: string;
  unit: string;
  title: string;
  titleAr: string;
  prompt: string;
  promptAr: string;
  modelEssay: string;
}

// Ministerial-required English compositions (Iraqi 6th grade)
// Source: "all articles of all unit" — by Mohammed AlNidawi.
// Every essay below is required by the ministerial exam and the student must memorize it precisely.
export const englishEssayTopics: EnglishEssayTopic[] = [
  {
    id: "cigarette-ads",
    unit: "Unit 1",
    title: "Cigarette advertising should be illegal",
    titleAr: "يجب أن يكون إعلان السكائر غير قانوني",
    prompt: "Write 100-120 words on: \"Cigarette advertising should be illegal\".",
    promptAr: "أكتب 100-120 كلمة حول: \"يجب أن يكون إعلان السكائر غير قانوني\".",
    modelEssay: `Cigarettes are harmful to the health of smokers and passive smokers because they are both at risk of the same health problems because cigarettes damage the heart and the lungs.

Firstly, cigarette advertisements can be seen on T.V programmes, in magazines and in different areas in the city by children and teenagers who can be easily influenced by these advertisements.

Secondly, cigarette advertisements show attractive and popular people are smoking, which give a wrong message to teenagers about smoking. On the other side, they don't mention the dangers of smoking on health, especially it leads to lung cancer.

Lastly, I feel that banning cigarettes advertisings is one of the best ways to protect young people from starting smoking as well as reducing smoking among people.`,
  },
  {
    id: "car-accidents",
    unit: "Unit 1",
    title: "How to reduce the number of car accidents",
    titleAr: "كيفية تقليل عدد حوادث السيارات",
    prompt: "Write 100-120 words on: \"How to reduce the number of car accidents\". Add words and phrases to link the ideas.",
    promptAr: "أكتب 100-120 كلمة حول: \"كيفية تقليل عدد حوادث السيارات\" مع كلمات ربط بين الأفكار.",
    modelEssay: `There are thousands of car accidents a year which cause serious injuries, and many drivers all over the world are killed or injured because of them. So, we have to find ways to reduce car accidents for the safety of people.

Firstly, drivers must follow traffic rules like road signs, stop signals and speed limit, also they should be more careful at junctions and don't jump the red signals.

Secondly, badly maintained cars as those with bad brakes, wheel and lights may cause accidents that lead to serious injuries. Furthermore, some drivers don't focus on driving because of using mobile phones, changing music or eating while driving that reduce their attention.

Lastly, I think the best solutions to reduce car accidents are to put more speed cameras on the streets especially highways and impose heavier fines on drivers who don't obey the speed limit.`,
  },
  {
    id: "road-safety",
    unit: "Unit 2",
    title: "The importance of road safety",
    titleAr: "أهمية سلامة الطريق",
    prompt: "Write a short essay (100-120 words) on the importance of road safety.",
    promptAr: "أكتب مقالة قصيرة (100-120 كلمة) عن أهمية سلامة الطريق.",
    modelEssay: `Road safety is very important because it protects all people from injuries or death, so we should learn some tips and rules to drive safely and avoid accidents.
You should obey traffic signals like stop signs, red lights, wear seatbelts, maintain the speed limit and safe distance. You shouldn't drive without having your driving licence because you can be stopped by policemen and get a fine for not having it. You should always check the car brakes as many accidents happen because of brakes malfunction.

To keep your car safe, avoid parking in illegal places since parking there can be dangerous, also the car can be towed away and you can get a fine. You shouldn't leave keys in the ignition because someone can take them and steal your car. You shouldn't leave valuable things in the car because they can be stolen easily. If you did these things, I ensure you that you helped to keep both the road and your car safe.`,
  },
  {
    id: "security-guard-job",
    unit: "Unit 2",
    title: "Advice on how to get a security guard job",
    titleAr: "نصيحة حول كيفية الحصول على وظيفة حارس أمن",
    prompt: "Write a letter to your friend \"Ahmed\" of about 100-120 words giving him advice on how to get a security guard job.",
    promptAr: "أكتب رسالة إلى صديقك أحمد بحدود 100-120 كلمة لتنصحه كيف يحصل على وظيفة حارس أمن.",
    modelEssay: `Dear Ahmed,

Tomorrow morning you are meeting the manager of the security company, so I'd like to advise you that you shouldn't stay up late because you should wake up early tomorrow. You should arrive at the company ten minutes early to make a good impression about you. You shouldn't go by bus since it moves slowly, so you'd better take a taxi and follow the directions the manager has sent you before.

You should wear a suit to look smart. You should be quiet and confident to prove to the manager that you have the right skills to get the job. You should listen carefully to what the manager is saying and answer all the questions accurately. You shouldn't ask about the salary and you should be grateful to the manager.

Best wishes,
Ali`,
  },
  {
    id: "english-course",
    unit: "Unit 3",
    title: "Doing an English course",
    titleAr: "الالتحاق بدورة اللغة الإنكليزية",
    prompt: "Write an email of 100-120 words to a friend asking them to come with you abroad this summer to do an English course.",
    promptAr: "أكتب إيميل 100-120 كلمة لصديق تطلب منه مرافقتك للخارج هذا الصيف للالتحاق بدورة لغة إنكليزية.",
    modelEssay: `Dear Ali,
I'm thinking of doing an English course at Oxford University this summer. I was thinking of going there for three weeks in summer, so I was asking if you would like to join me. The college has both country and city locations. Personally, I prefer a city location because there is so much to do. There is also a choice of accommodation, so we can stay in a home or in a hostel. I think a homestay is better as we will get more chance to meet British people and speak English in the evenings.

The price of the course will be £150 a week, and the accommodation will cost £75 a week. We will also need to take pocket money for shopping, food and souvenir. I think it will be worth it even if it costs a lot of money because we will learn the language and visit some wonderful places.
I really hope you can come. Looking forward to hearing from you.

Best wishes,
Mustafa`,
  },
  {
    id: "studying-english-britain",
    unit: "Unit 3",
    title: "The advantages of studying English in Britain",
    titleAr: "مميزات دراسة اللغة الإنكليزية في بريطانيا",
    prompt: "Write 100-120 words on the advantages of studying English in Britain.",
    promptAr: "أكتب 100-120 كلمة حول مميزات دراسة اللغة الإنكليزية في بريطانيا.",
    modelEssay: `It is good to learn the language in the country where it is native. So, Britain is the best place for students who want to learn English.

All teachers are qualified and experienced; classes are small, which means the students will be sure to get a high level of individual attention.

In Britain, you can hear people speaking English all day in many different situations, and you can improve your language by reading newspapers, magazines and notices; also you'll watch TV and you will listen to radio in English too.

I don't advise you to live in a private accommodation, so I think it is better to stay with a British family because it will help you to practise English and to discover the British way of life and the British cultures.`,
  },
  {
    id: "setting-up-company",
    unit: "Unit 4",
    title: "Setting up a company",
    titleAr: "إنشاء شركة",
    prompt: "Write an e-mail of 100-120 words telling a friend about a company you have recently set up with a friend or relative.",
    promptAr: "أكتب إيميل 100-120 كلمة تخبر صديقك عن شركة أنشأتها مؤخراً مع صديق أو قريب.",
    modelEssay: `Dear Rana,

I'm sorry I haven't been in touch for six months because I've had so much work to do. My father and I set up our own company last March. It's called "Moon Company for Cosmetics". My father is the manager and I do all the marketing. My cousin, Ali, works as my father's personal assistant.

We invested a lot of money in the business, so we aren't making a profit yet. But the sales are very good and we are exporting a lot of cosmetics to different countries especially UAE, Oman, Lebanon and even Turkey. The future looks very bright, thank God.

Three months ago, we went to Egypt to show our products to the stores and malls. There was a lot of interest in our products, we signed contracts with many stores there, we had great time.

Lots of love,
Dania

ملاحظة: إذا كان السؤال عن شركة مختلفة (مثلاً ملابس)، أكتب نفس الإنشاء مع تغيير كلمة cosmetics إلى المنتج المطلوب.`,
  },
  {
    id: "wonderful-holiday",
    unit: "Unit 5",
    title: "A wonderful holiday I have had",
    titleAr: "عطلة رائعة قمتُ بها",
    prompt: "Write a short article for a travel magazine of 100-120 words on a wonderful holiday you have had.",
    promptAr: "أكتب مقالة قصيرة 100-120 كلمة لمجلة سفر حول عطلة رائعة قمت بها.",
    modelEssay: `Two months ago, I went on a trip with my friends to Istanbul which is the biggest city in Turkey. It was a package deal and cost 600$ each. We stayed in a five-star hotel near the beach which has a nice restaurant and a wonderful garden.

The weather was sunny there, the food was good and we had delicious Turkish meals. The people were friendly and nice too. Every morning we went shopping and sightseeing, while there were many entertainments in the evening.

We went to Sultan Ahmed mosque and we also visited The National Museum and many different Malls there. Everything was fabulous in Istanbul, for example; food, transportation and accommodation. We really spent a spectacular and fantastic holiday in that beautiful city.`,
  },
  {
    id: "advice-tourists-iraq",
    unit: "Unit 5",
    title: "Advice to tourists in Iraq",
    titleAr: "نصيحة إلى السياح في العراق",
    prompt: "Write a short article for a travel magazine of 100-120 words on Advice to tourists in Iraq.",
    promptAr: "أكتب مقالة قصيرة 100-120 كلمة حول نصيحة إلى السياح في العراق.",
    modelEssay: `When you decide to visit Iraq, you should take into consideration that Iraq is full of places that deserve to be visited.

Firstly, there are a lot of historical places, on top of them is the capital 'Baghdad' which was built by the Abbasid Caliph 'Abu Jaafar AlMansour' in 764. In Baghdad, you can stay in a hotel overlooking the Tigris River. I also advise you to visit the National Museum there and to do shopping at Baghdadi bazaars.

Secondly, if you are interested in ruins, you should visit the ancient places in Babylon, Ur and Hatra.

Thirdly, you can enjoy the nice resorts and high mountains in the north of Iraq and the marshes in the south.

Finally, don't forget to bring your camera to keep your memories about the fantastic places you will visit.`,
  },
  {
    id: "future-tourism-iraq",
    unit: "Unit 5",
    title: "The Future of Tourism in Iraq",
    titleAr: "مستقبل السياحة في العراق",
    prompt: "Write a short article for a travel magazine of 100-120 words on the future of tourism in Iraq.",
    promptAr: "أكتب مقالة قصيرة 100-120 كلمة حول مستقبل السياحة في العراق.",
    modelEssay: `Tourism in Iraq has a bright future. Iraq is a country with a long history, rich culture, and beautiful nature. Many people around the world are starting to discover its special places. For instance, Cities like Baghdad, Basra, Mosul, and Najaf have many historical and religious sites.

For this reason, the government is improving public transportation by adding new bus and train routes between cities. This makes travel around Iraq easier for tourists. Iraq is also building more hotels to welcome visitors from different countries. As well as, local tour guides organize trips to old markets, ancient ruins, the Marshes, and the mountains too.

With these improvements, Iraq can become a popular and welcoming tourist destination in the future.`,
  },
  {
    id: "atm-lack",
    unit: "Unit 6",
    title: "The lack of ATM machines",
    titleAr: "نقص أجهزة الصراف الآلي",
    prompt: "Write a letter of complaint (100-120 words) to your bank about the lack of ATM machines in the area.",
    promptAr: "أكتب رسالة شكوى (100-120 كلمة) إلى مصرفك عن نقص أجهزة الصراف الآلي في المنطقة.",
    modelEssay: `Dear Sir,                                            20/5/2027

I am writing to complain about the lack of ATM machines in our area because it has become a serious problem that makes daily life harder. As you know, most people need cash for shopping, paying bills, and transportation, but the small number of ATMs makes this simple task very difficult.

Moreover, many people have to wait in long lines to get money, but this is very hard, especially for elderly people. Also, when the bank closes at night, it becomes difficult to find an ATM nearby. This problem affects local shops because customers cannot get cash easily. I think you can solve this problem by installing more ATMs in busy places and checking them regularly.

Thank you for your help.

Yours sincerely,
Mohammed Ahmed`,
  },
  {
    id: "complaint-withdrawal",
    unit: "Unit 6",
    title: "A complaint to the bank",
    titleAr: "شكوى إلى مصرف",
    prompt: "Write a letter to your bank (100-120 words) to complain about a withdrawal shown on your statement that you didn't make.",
    promptAr: "أكتب رسالة (100-120 كلمة) إلى مصرفك للشكوى عن سحب ظاهر في كشف حسابك ولم تقم به.",
    modelEssay: `Dear Sir,                                          20/5/2026

I am one of your clients and it is pleasure to write to you. I am writing to enquire about my withdrawal. Last Friday, I got my monthly bank statement and I would like to inform you about the problem that I discovered when I received it. I was really surprised because I found in it a withdrawal that I did not make.

The date of the withdrawal shows that it had been made on the tenth of May. I have been on a holiday in England at that time, so how could I make that withdrawal! I am sure that you will check it up and solve this problem and inform me about that. I also enclosed the last bank statement that I hope it will be useful. I am looking forward to hearing from you.
Thank you for your help.

Yours faithfully,
Mohammed Ahmed`,
  },
];