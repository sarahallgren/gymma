// Övningsbibliotek, veckoschema och rotation på 4 veckor.
// "id" får aldrig ändras efter att du loggat pass, eftersom historiken pekar på det.
//
// Bilderna kommer från Free Exercise DB (public domain):
// https://github.com/yuhonas/free-exercise-db
// Varje övning har två bilder i mappen bilder/: <id>-0.jpg (start) och <id>-1.jpg (slut).
// "img" är övningens namn i Free Exercise DB. "part" är vilken del av muskeln övningen tar mest.
// "eq" är redskapet: maskin, kabel, hantlar, stang eller kropp (se EQUIPMENT).
// "unit: 'sek'" betyder att övningen mäts i sekunder i stället för reps.
// "hidden: true" tar bort övningen från listor och sök, men gamla pass visar fortfarande namnet.

// Mål för varje övning: 4 set med 12 reps. Du loggar bara sista setet.
const DEFAULT_SETS = 4;
const DEFAULT_REPS = 12;

// Redskap. "eq" på varje övning pekar på ett id här.
const EQUIPMENT = [
  { id: 'maskin', name: 'Maskin' },
  { id: 'kabel', name: 'Kabel' },
  { id: 'hantlar', name: 'Hantlar' },
  { id: 'stang', name: 'Stång' },
  { id: 'kropp', name: 'Kroppsvikt' },
];

const GROUPS = ['Axlar', 'Vader', 'Rygg', 'Triceps', 'Bröst', 'Biceps', 'Ben', 'Mage'];

const EXERCISES = [
  // Axlar
  { id: 'axelpress', name: 'Axelpress med hantlar', group: 'Axlar', part: 'Främre axeln', img: 'Dumbbell_Shoulder_Press', eq: 'hantlar' },
  { id: 'axelpress-maskin', name: 'Axelpress i maskin', group: 'Axlar', part: 'Främre axeln', img: 'Leverage_Shoulder_Press', eq: 'maskin' },
  { id: 'arnoldpress', name: 'Arnoldpress', group: 'Axlar', part: 'Främre axeln', img: 'Arnold_Dumbbell_Press', eq: 'hantlar' },
  { id: 'framlyft', name: 'Framåtlyft med hantlar', group: 'Axlar', part: 'Främre axeln', img: 'Front_Dumbbell_Raise', eq: 'hantlar' },
  { id: 'sidolyft', name: 'Sidolyft', group: 'Axlar', part: 'Sidan av axeln', img: 'Side_Lateral_Raise', eq: 'hantlar' },
  { id: 'sidolyft-kabel', name: 'Sidolyft i kabel', group: 'Axlar', part: 'Sidan av axeln', img: 'Cable_Seated_Lateral_Raise', eq: 'kabel' },
  { id: 'sidolyft-sittande', name: 'Sittande sidolyft', group: 'Axlar', part: 'Sidan av axeln', img: 'Seated_Side_Lateral_Raise', eq: 'hantlar' },
  { id: 'omvanda-flyes', name: 'Omvända flyes', group: 'Axlar', part: 'Bakre axeln', img: 'Reverse_Flyes', eq: 'hantlar' },
  { id: 'face-pulls', name: 'Face pulls', group: 'Axlar', part: 'Bakre axeln', img: 'Face_Pull', eq: 'kabel' },
  { id: 'bakre-delt-kabel', name: 'Bakre flyes i kabel', group: 'Axlar', part: 'Bakre axeln', img: 'Cable_Rear_Delt_Fly', eq: 'kabel' },
  { id: 'shrugs', name: 'Shrugs med hantlar', group: 'Axlar', part: 'Kappmuskeln', img: 'Dumbbell_Shrug', eq: 'hantlar' },
  { id: 'militarpress', name: 'Militärpress', group: 'Axlar', part: 'Främre axeln', img: 'Standing_Military_Press', eq: 'stang' },
  { id: 'omvanda-flyes-maskin', name: 'Omvända flyes i maskin', group: 'Axlar', part: 'Bakre axeln', img: 'Reverse_Machine_Flyes', eq: 'maskin' },
  { id: 'liggande-sidolyft', name: 'Liggande sidolyft', group: 'Axlar', part: 'Sidan av axeln', img: 'Lying_One-Arm_Lateral_Raise', eq: 'hantlar' },

  // Vader
  { id: 'vadpress', name: 'Stående vadpress', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Standing_Calf_Raises', eq: 'maskin' },
  { id: 'vadpress-benpress', name: 'Vadpress i benpress', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Calf_Press_On_The_Leg_Press_Machine', eq: 'maskin' },
  { id: 'vadpress-hantel', name: 'Stående vadpress med hantlar', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Standing_Dumbbell_Calf_Raise', eq: 'hantlar' },
  // Borttagen (hidden) – finns kvar så att gamla pass visar rätt namn
  { id: 'asnevadpress', name: 'Åsnevadpress', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Donkey_Calf_Raises', eq: 'kropp', hidden: true },
  { id: 'vadpress-stang', name: 'Stående vadpress med stång', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Standing_Barbell_Calf_Raise', eq: 'stang' },
  { id: 'sittande-vadpress', name: 'Sittande vadpress', group: 'Vader', part: 'Böjda knän – djupa vadmuskeln', img: 'Seated_Calf_Raise', eq: 'maskin' },
  { id: 'sittande-vadpress-hantel', name: 'Sittande vadpress med hantel', group: 'Vader', part: 'Böjda knän – djupa vadmuskeln', img: 'Dumbbell_Seated_One-Leg_Calf_Raise', eq: 'hantlar' },
  { id: 'sittande-vadpress-stang', name: 'Sittande vadpress med stång', group: 'Vader', part: 'Böjda knän – djupa vadmuskeln', img: 'Barbell_Seated_Calf_Raise', eq: 'stang' },
  { id: 'vadpress-smith', name: 'Vadpress i Smithmaskin', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Smith_Machine_Calf_Raise', eq: 'maskin' },

  // Rygg
  { id: 'latsdrag', name: 'Latsdrag', group: 'Rygg', part: 'Bredd – latsen', img: 'Wide-Grip_Lat_Pulldown', eq: 'kabel' },
  { id: 'latsdrag-smalt', name: 'Latsdrag med smalt grepp', group: 'Rygg', part: 'Bredd – latsen', img: 'Close-Grip_Front_Lat_Pulldown', eq: 'kabel' },
  { id: 'chins', name: 'Chins', group: 'Rygg', part: 'Bredd – latsen', img: 'Chin-Up', eq: 'kropp' },
  { id: 'raka-armar-pulldown', name: 'Pulldown med raka armar', group: 'Rygg', part: 'Bredd – latsen', img: 'Straight-Arm_Pulldown', eq: 'kabel' },
  { id: 'sittande-rodd', name: 'Sittande rodd', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'Seated_Cable_Rows', eq: 'kabel' },
  { id: 'hantelrodd', name: 'Hantelrodd', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'One-Arm_Dumbbell_Row', eq: 'hantlar' },
  { id: 't-bar-rodd', name: 'T-bar-rodd', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'T-Bar_Row_with_Handle', eq: 'stang' },
  { id: 'ryggresningar', name: 'Ryggresningar', group: 'Rygg', part: 'Nedre ryggen', img: 'Hyperextensions_Back_Extensions', eq: 'kropp' },
  { id: 'marklyft', name: 'Marklyft', group: 'Rygg', part: 'Nedre ryggen', img: 'Barbell_Deadlift', eq: 'stang' },
  { id: 'good-morning', name: 'Good morning', group: 'Rygg', part: 'Nedre ryggen', img: 'Good_Morning', eq: 'stang' },
  { id: 'skivstangsrodd', name: 'Skivstångsrodd', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'Bent_Over_Barbell_Row', eq: 'stang' },
  { id: 'rodd-maskin', name: 'Rodd i maskin', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'Leverage_High_Row', eq: 'maskin' },
  { id: 'pullups', name: 'Pullups', group: 'Rygg', part: 'Bredd – latsen', img: 'Pullups', eq: 'kropp' },
  { id: 'latsdrag-v', name: 'Latsdrag med V-handtag', group: 'Rygg', part: 'Bredd – latsen', img: 'V-Bar_Pulldown', eq: 'kabel' },
  { id: 'superman', name: 'Superman', group: 'Rygg', part: 'Nedre ryggen', img: 'Superman', eq: 'kropp' },

  // Triceps
  { id: 'triceps-overhead', name: 'Tricepsextension över huvudet', group: 'Triceps', part: 'Långa huvudet', img: 'Cable_Rope_Overhead_Triceps_Extension', eq: 'kabel' },
  { id: 'skullcrusher', name: 'Skullcrusher', group: 'Triceps', part: 'Långa huvudet', img: 'EZ-Bar_Skullcrusher', eq: 'stang' },
  { id: 'skullcrusher-hantlar', name: 'Skullcrusher med hantlar och armbågsstöd', group: 'Triceps', part: 'Långa huvudet', img: 'Lying_Dumbbell_Tricep_Extension', eq: 'hantlar' },
  { id: 'triceps-hantel-overhead', name: 'Tricepsextension med hantel', group: 'Triceps', part: 'Långa huvudet', img: 'Standing_Dumbbell_Triceps_Extension', eq: 'hantlar' },
  { id: 'triceps-pushdown', name: 'Triceps pushdown', group: 'Triceps', part: 'Yttre huvudet', img: 'Triceps_Pushdown', eq: 'kabel' },
  { id: 'triceps-rep', name: 'Triceps pushdown med rep', group: 'Triceps', part: 'Yttre huvudet', img: 'Triceps_Pushdown_-_Rope_Attachment', eq: 'kabel' },
  { id: 'dips', name: 'Dips', group: 'Triceps', part: 'Yttre huvudet', img: 'Dips_-_Triceps_Version', eq: 'kropp' },
  { id: 'triceps-omvant', name: 'Pushdown med omvänt grepp', group: 'Triceps', part: 'Inre huvudet', img: 'Reverse_Grip_Triceps_Pushdown', eq: 'kabel' },
  { id: 'bankpress-smalt', name: 'Bänkpress med smalt grepp', group: 'Triceps', part: 'Inre huvudet', img: 'Close-Grip_Barbell_Bench_Press', eq: 'stang' },
  { id: 'tate-press', name: 'Tate press', group: 'Triceps', part: 'Inre huvudet', img: 'Tate_Press', eq: 'hantlar' },
  { id: 'kickbacks', name: 'Kickbacks med hantel', group: 'Triceps', part: 'Inre huvudet', img: 'Tricep_Dumbbell_Kickback', eq: 'hantlar' },
  { id: 'bankdips', name: 'Bänkdips', group: 'Triceps', part: 'Inre huvudet', img: 'Bench_Dips', eq: 'kropp' },
  { id: 'tricepspress-maskin', name: 'Tricepspress i maskin', group: 'Triceps', part: 'Yttre huvudet', img: 'Machine_Triceps_Extension', eq: 'maskin' },

  // Bröst
  { id: 'hantelpress-lutande', name: 'Lutande hantelpress', group: 'Bröst', part: 'Övre bröstet', img: 'Incline_Dumbbell_Press', eq: 'hantlar' },
  { id: 'lutande-bankpress', name: 'Lutande bänkpress', group: 'Bröst', part: 'Övre bröstet', img: 'Barbell_Incline_Bench_Press_-_Medium_Grip', eq: 'stang' },
  { id: 'lutande-flyes', name: 'Lutande hantelflyes', group: 'Bröst', part: 'Övre bröstet', img: 'Incline_Dumbbell_Flyes', eq: 'hantlar' },
  { id: 'bankpress', name: 'Bänkpress', group: 'Bröst', part: 'Mitten av bröstet', img: 'Barbell_Bench_Press_-_Medium_Grip', eq: 'stang' },
  { id: 'hantelpress', name: 'Hantelpress', group: 'Bröst', part: 'Mitten av bröstet', img: 'Dumbbell_Bench_Press', eq: 'hantlar' },
  { id: 'brostpress-maskin', name: 'Bröstpress i maskin', group: 'Bröst', part: 'Mitten av bröstet', img: 'Machine_Bench_Press', eq: 'maskin' },
  { id: 'hantelflyes', name: 'Hantelflyes', group: 'Bröst', part: 'Mitten av bröstet', img: 'Dumbbell_Flyes', eq: 'hantlar' },
  { id: 'butterfly', name: 'Butterfly', group: 'Bröst', part: 'Mitten av bröstet', img: 'Butterfly', eq: 'maskin' },
  { id: 'flyes-kabel', name: 'Flyes i kabel uppifrån och ned', group: 'Bröst', part: 'Nedre bröstet', img: 'Cable_Crossover', eq: 'kabel' },
  { id: 'dips-brost', name: 'Dips för bröstet', group: 'Bröst', part: 'Nedre bröstet', img: 'Dips_-_Chest_Version', eq: 'kropp' },
  { id: 'nedatlutande-hantelpress', name: 'Nedåtlutande hantelpress', group: 'Bröst', part: 'Nedre bröstet', img: 'Decline_Dumbbell_Bench_Press', eq: 'hantlar' },
  { id: 'flyes-kabel-nedifran', name: 'Flyes i kabel nedifrån och upp', group: 'Bröst', part: 'Övre bröstet', img: 'Low_Cable_Crossover', eq: 'kabel' },
  { id: 'lutande-brostpress-maskin', name: 'Lutande bröstpress i maskin', group: 'Bröst', part: 'Övre bröstet', img: 'Leverage_Incline_Chest_Press', eq: 'maskin' },
  { id: 'armhavningar', name: 'Armhävningar', group: 'Bröst', part: 'Mitten av bröstet', img: 'Pushups', eq: 'kropp' },
  { id: 'nedatlutande-bankpress', name: 'Nedåtlutande bänkpress', group: 'Bröst', part: 'Nedre bröstet', img: 'Decline_Barbell_Bench_Press', eq: 'stang' },

  // Biceps
  { id: 'lutande-hantelcurl', name: 'Lutande hantelcurl', group: 'Biceps', part: 'Långa huvudet', img: 'Incline_Dumbbell_Curl', eq: 'hantlar' },
  { id: 'stangcurl-smalt', name: 'Stångcurl med smalt grepp', group: 'Biceps', part: 'Långa huvudet', img: 'Close-Grip_Standing_Barbell_Curl', eq: 'stang' },
  { id: 'bicepscurl', name: 'Bicepscurl med hantlar', group: 'Biceps', part: 'Långa huvudet', img: 'Dumbbell_Bicep_Curl', eq: 'hantlar' },
  { id: 'kabelcurl', name: 'Bicepscurl i kabel', group: 'Biceps', part: 'Långa huvudet', img: 'Standing_Biceps_Cable_Curl', eq: 'kabel' },
  { id: 'preachercurl', name: 'Preachercurl', group: 'Biceps', part: 'Korta huvudet', img: 'Preacher_Curl', eq: 'stang' },
  { id: 'koncentrationscurl', name: 'Koncentrationscurl', group: 'Biceps', part: 'Korta huvudet', img: 'Concentration_Curls', eq: 'hantlar' },
  { id: 'stangcurl-brett', name: 'Stångcurl med brett grepp', group: 'Biceps', part: 'Korta huvudet', img: 'Wide-Grip_Standing_Barbell_Curl', eq: 'stang' },
  { id: 'stangcurl', name: 'Stångcurl', group: 'Biceps', part: 'Korta huvudet', img: 'Barbell_Curl', eq: 'stang' },
  { id: 'hammarcurl', name: 'Hammarcurl', group: 'Biceps', part: 'Underarmen – brachialis', img: 'Hammer_Curls', eq: 'hantlar' },
  { id: 'hammarcurl-rep', name: 'Hammarcurl med rep i kabel', group: 'Biceps', part: 'Underarmen – brachialis', img: 'Cable_Hammer_Curls_-_Rope_Attachment', eq: 'kabel' },
  { id: 'omvand-stangcurl', name: 'Stångcurl med omvänt grepp', group: 'Biceps', part: 'Underarmen – brachialis', img: 'Reverse_Barbell_Curl', eq: 'stang' },
  { id: 'bicepscurl-maskin', name: 'Bicepscurl i maskin', group: 'Biceps', part: 'Korta huvudet', img: 'Machine_Bicep_Curl', eq: 'maskin' },
  { id: 'zottman-curl', name: 'Zottman curl', group: 'Biceps', part: 'Underarmen – brachialis', img: 'Zottman_Curl', eq: 'hantlar' },

  // Ben
  { id: 'knaboj', name: 'Knäböj', group: 'Ben', part: 'Framsida lår', img: 'Barbell_Squat', eq: 'stang' },
  { id: 'benpress', name: 'Benpress', group: 'Ben', part: 'Framsida lår', img: 'Leg_Press', eq: 'maskin' },
  { id: 'benspark', name: 'Benspark', group: 'Ben', part: 'Framsida lår', img: 'Leg_Extensions', eq: 'maskin' },
  { id: 'bencurl', name: 'Liggande bencurl', group: 'Ben', part: 'Baksida lår', img: 'Lying_Leg_Curls', eq: 'maskin' },
  { id: 'rumanskt-marklyft', name: 'Rumänskt marklyft', group: 'Ben', part: 'Baksida lår', img: 'Romanian_Deadlift', eq: 'stang' },
  { id: 'sittande-bencurl', name: 'Sittande bencurl', group: 'Ben', part: 'Baksida lår', img: 'Seated_Leg_Curl', eq: 'maskin' },
  { id: 'hoftlyft', name: 'Höftlyft med stång', group: 'Ben', part: 'Sätet', img: 'Barbell_Hip_Thrust', eq: 'stang' },
  { id: 'utfall', name: 'Utfall med hantlar', group: 'Ben', part: 'Sätet', img: 'Dumbbell_Lunges', eq: 'hantlar' },
  { id: 'bulgarisk-utfall', name: 'Bulgariska utfall', group: 'Ben', part: 'Sätet', img: 'Split_Squat_with_Dumbbells', eq: 'hantlar' },
  { id: 'hacklift', name: 'Hacklift', group: 'Ben', part: 'Framsida lår', img: 'Hack_Squat', eq: 'maskin' },
  { id: 'goblet-squat', name: 'Goblet squat', group: 'Ben', part: 'Framsida lår', img: 'Goblet_Squat', eq: 'hantlar' },
  { id: 'utatforare', name: 'Utåtförare', group: 'Ben', part: 'Sätet', img: 'Thigh_Abductor', eq: 'maskin' },
  { id: 'glute-kickback-kabel', name: 'Glute kickback i kabel', group: 'Ben', part: 'Sätet', img: 'One-Legged_Cable_Kickback', eq: 'kabel' },
  { id: 'inatforare', name: 'Inåtförare', group: 'Ben', part: 'Insida lår', img: 'Thigh_Adductor', eq: 'maskin' },
  { id: 'stelbent-marklyft-hantlar', name: 'Stelbent marklyft med hantlar', group: 'Ben', part: 'Baksida lår', img: 'Stiff-Legged_Dumbbell_Deadlift', eq: 'hantlar' },

  // Mage
  { id: 'cable-crunch', name: 'Cable crunch', group: 'Mage', part: 'Övre magen', img: 'Cable_Crunch', eq: 'kabel' },
  { id: 'magmaskin', name: 'Crunch i maskin', group: 'Mage', part: 'Övre magen', img: 'Ab_Crunch_Machine', eq: 'maskin' },
  { id: 'crunches', name: 'Crunches', group: 'Mage', part: 'Övre magen', img: 'Crunches', eq: 'kropp' },
  { id: 'hangande-benlyft', name: 'Hängande benlyft', group: 'Mage', part: 'Nedre magen', img: 'Hanging_Leg_Raise', eq: 'kropp' },
  { id: 'omvand-crunch', name: 'Omvänd crunch', group: 'Mage', part: 'Nedre magen', img: 'Reverse_Crunch', eq: 'kropp' },
  { id: 'liggande-benlyft', name: 'Liggande benlyft', group: 'Mage', part: 'Nedre magen', img: 'Flat_Bench_Lying_Leg_Raise', eq: 'kropp' },
  { id: 'pallof', name: 'Pallof press', group: 'Mage', part: 'Sneda magmusklerna', img: 'Pallof_Press', eq: 'kabel' },
  { id: 'russian-twist', name: 'Russian twist', group: 'Mage', part: 'Sneda magmusklerna', img: 'Russian_Twist', eq: 'kropp' },
  { id: 'sneda-crunches', name: 'Sneda crunches', group: 'Mage', part: 'Sneda magmusklerna', img: 'Oblique_Crunches', eq: 'kropp' },
  { id: 'plankan', name: 'Plankan', group: 'Mage', part: 'Hela bålen', img: 'Plank', eq: 'kropp', unit: 'sek', defaultReps: 30 },
  { id: 'maghjul', name: 'Maghjul', group: 'Mage', part: 'Hela bålen', img: 'Ab_Roller', eq: 'kropp' },
  { id: 'sidoplanka', name: 'Sidoplanka', group: 'Mage', part: 'Sneda magmusklerna', img: 'Side_Bridge', eq: 'kropp', unit: 'sek', defaultReps: 30 },
  { id: 'nedatlutande-crunch', name: 'Nedåtlutande crunch', group: 'Mage', part: 'Övre magen', img: 'Decline_Crunch', eq: 'kropp' },
  { id: 'omvand-crunch-kabel', name: 'Omvänd crunch i kabel', group: 'Mage', part: 'Nedre magen', img: 'Cable_Reverse_Crunch', eq: 'kabel' },
];

// Veckoschemat. "day": 1 = måndag … 5 = fredag (6 = lördag, 0 = söndag).
const SCHEDULE = [
  { day: 1, name: 'Måndag', groups: ['Axlar', 'Vader'] },
  { day: 2, name: 'Tisdag', groups: ['Rygg', 'Triceps'] },
  { day: 3, name: 'Onsdag', groups: ['Bröst', 'Biceps'] },
  { day: 5, name: 'Fredag', groups: ['Ben', 'Mage'] },
];

// Rotation på 4 veckor: 3 övningar per muskelgrupp och vecka – en för varje del av muskeln.
// Rad 1 = vecka 1, rad 2 = vecka 2 och så vidare. Lägg till eller ta bort rader för att ändra antalet veckor,
// men alla muskelgrupper måste ha lika många rader.
// Tunga lyft för nedre ryggen på tisdagar ligger i samma vecka som lättare baksida-lår på fredagar, och tvärtom.
const ROTATION = {
  Axlar: [
    ['axelpress', 'sidolyft', 'face-pulls'],
    ['militarpress', 'sidolyft-kabel', 'omvanda-flyes'],
    ['axelpress-maskin', 'liggande-sidolyft', 'bakre-delt-kabel'],
    ['arnoldpress', 'sidolyft-sittande', 'omvanda-flyes-maskin'],
  ],
  Vader: [
    ['vadpress', 'vadpress-hantel', 'sittande-vadpress'],
    ['vadpress-benpress', 'vadpress-stang', 'sittande-vadpress-hantel'],
    ['vadpress-smith', 'vadpress-hantel', 'sittande-vadpress'],
    ['vadpress-benpress', 'vadpress-stang', 'sittande-vadpress-stang'],
  ],
  Rygg: [
    ['latsdrag', 'hantelrodd', 'marklyft'],
    ['chins', 'sittande-rodd', 'ryggresningar'],
    ['latsdrag-v', 't-bar-rodd', 'good-morning'],
    ['pullups', 'rodd-maskin', 'superman'],
  ],
  Triceps: [
    ['triceps-overhead', 'dips', 'tate-press'],
    ['skullcrusher', 'triceps-pushdown', 'kickbacks'],
    ['skullcrusher-hantlar', 'tricepspress-maskin', 'triceps-omvant'],
    ['triceps-hantel-overhead', 'triceps-rep', 'bankpress-smalt'],
  ],
  Bröst: [
    ['lutande-bankpress', 'hantelpress', 'flyes-kabel'],
    ['hantelpress-lutande', 'brostpress-maskin', 'dips-brost'],
    ['lutande-brostpress-maskin', 'bankpress', 'nedatlutande-hantelpress'],
    ['flyes-kabel-nedifran', 'butterfly', 'nedatlutande-bankpress'],
  ],
  Biceps: [
    ['lutande-hantelcurl', 'preachercurl', 'hammarcurl-rep'],
    ['kabelcurl', 'koncentrationscurl', 'omvand-stangcurl'],
    ['stangcurl-smalt', 'bicepscurl-maskin', 'hammarcurl'],
    ['bicepscurl', 'stangcurl-brett', 'zottman-curl'],
  ],
  Ben: [
    ['knaboj', 'bencurl', 'glute-kickback-kabel'],
    ['benpress', 'rumanskt-marklyft', 'bulgarisk-utfall'],
    ['hacklift', 'sittande-bencurl', 'hoftlyft'],
    ['goblet-squat', 'stelbent-marklyft-hantlar', 'utatforare'],
  ],
  Mage: [
    ['cable-crunch', 'hangande-benlyft', 'russian-twist'],
    ['magmaskin', 'liggande-benlyft', 'pallof'],
    ['nedatlutande-crunch', 'omvand-crunch-kabel', 'sidoplanka'],
    ['crunches', 'omvand-crunch', 'sneda-crunches'],
  ],
};
