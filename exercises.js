// Övningsbibliotek, veckoschema och treveckorsrotation.
// "id" får aldrig ändras efter att du loggat pass, eftersom historiken pekar på det.
//
// Bilderna kommer från Free Exercise DB (public domain):
// https://github.com/yuhonas/free-exercise-db
// Varje övning har två bilder i mappen bilder/: <id>-0.jpg (start) och <id>-1.jpg (slut).
// "img" är övningens namn i Free Exercise DB. "part" är vilken del av muskeln övningen tar mest.
// "unit: 'sek'" betyder att övningen mäts i sekunder i stället för reps.

// Mål för varje övning: 4 set med 12 reps. Du loggar bara sista setet.
const DEFAULT_SETS = 4;
const DEFAULT_REPS = 12;

const GROUPS = ['Axlar', 'Vader', 'Rygg', 'Triceps', 'Bröst', 'Biceps', 'Ben', 'Mage'];

const EXERCISES = [
  // Axlar
  { id: 'axelpress', name: 'Axelpress med hantlar', group: 'Axlar', part: 'Främre axeln', img: 'Dumbbell_Shoulder_Press' },
  { id: 'axelpress-maskin', name: 'Axelpress i maskin', group: 'Axlar', part: 'Främre axeln', img: 'Leverage_Shoulder_Press' },
  { id: 'arnoldpress', name: 'Arnoldpress', group: 'Axlar', part: 'Främre axeln', img: 'Arnold_Dumbbell_Press' },
  { id: 'framlyft', name: 'Framåtlyft med hantlar', group: 'Axlar', part: 'Främre axeln', img: 'Front_Dumbbell_Raise' },
  { id: 'sidolyft', name: 'Sidolyft', group: 'Axlar', part: 'Sidan av axeln', img: 'Side_Lateral_Raise' },
  { id: 'sidolyft-kabel', name: 'Sidolyft i kabel', group: 'Axlar', part: 'Sidan av axeln', img: 'Cable_Seated_Lateral_Raise' },
  { id: 'sidolyft-sittande', name: 'Sittande sidolyft', group: 'Axlar', part: 'Sidan av axeln', img: 'Seated_Side_Lateral_Raise' },
  { id: 'omvanda-flyes', name: 'Omvända flyes', group: 'Axlar', part: 'Bakre axeln', img: 'Reverse_Flyes' },
  { id: 'face-pulls', name: 'Face pulls', group: 'Axlar', part: 'Bakre axeln', img: 'Face_Pull' },
  { id: 'bakre-delt-kabel', name: 'Bakre flyes i kabel', group: 'Axlar', part: 'Bakre axeln', img: 'Cable_Rear_Delt_Fly' },
  { id: 'shrugs', name: 'Shrugs med hantlar', group: 'Axlar', part: 'Kappmuskeln', img: 'Dumbbell_Shrug' },

  // Vader
  { id: 'vadpress', name: 'Stående vadpress', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Standing_Calf_Raises' },
  { id: 'vadpress-benpress', name: 'Vadpress i benpress', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Calf_Press_On_The_Leg_Press_Machine' },
  { id: 'vadpress-hantel', name: 'Stående vadpress med hantlar', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Standing_Dumbbell_Calf_Raise' },
  { id: 'asnevadpress', name: 'Åsnevadpress', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Donkey_Calf_Raises' },
  { id: 'vadpress-stang', name: 'Stående vadpress med stång', group: 'Vader', part: 'Raka ben – stora vadmuskeln', img: 'Standing_Barbell_Calf_Raise' },
  { id: 'sittande-vadpress', name: 'Sittande vadpress', group: 'Vader', part: 'Böjda knän – djupa vadmuskeln', img: 'Seated_Calf_Raise' },
  { id: 'sittande-vadpress-hantel', name: 'Sittande vadpress med hantel', group: 'Vader', part: 'Böjda knän – djupa vadmuskeln', img: 'Dumbbell_Seated_One-Leg_Calf_Raise' },
  { id: 'sittande-vadpress-stang', name: 'Sittande vadpress med stång', group: 'Vader', part: 'Böjda knän – djupa vadmuskeln', img: 'Barbell_Seated_Calf_Raise' },

  // Rygg
  { id: 'latsdrag', name: 'Latsdrag', group: 'Rygg', part: 'Bredd – latsen', img: 'Wide-Grip_Lat_Pulldown' },
  { id: 'latsdrag-smalt', name: 'Latsdrag med smalt grepp', group: 'Rygg', part: 'Bredd – latsen', img: 'Close-Grip_Front_Lat_Pulldown' },
  { id: 'chins', name: 'Chins', group: 'Rygg', part: 'Bredd – latsen', img: 'Chin-Up' },
  { id: 'raka-armar-pulldown', name: 'Pulldown med raka armar', group: 'Rygg', part: 'Bredd – latsen', img: 'Straight-Arm_Pulldown' },
  { id: 'sittande-rodd', name: 'Sittande rodd', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'Seated_Cable_Rows' },
  { id: 'hantelrodd', name: 'Hantelrodd', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'One-Arm_Dumbbell_Row' },
  { id: 't-bar-rodd', name: 'T-bar-rodd', group: 'Rygg', part: 'Tjocklek – mitten av ryggen', img: 'T-Bar_Row_with_Handle' },
  { id: 'ryggresningar', name: 'Ryggresningar', group: 'Rygg', part: 'Nedre ryggen', img: 'Hyperextensions_Back_Extensions' },
  { id: 'marklyft', name: 'Marklyft', group: 'Rygg', part: 'Nedre ryggen', img: 'Barbell_Deadlift' },
  { id: 'good-morning', name: 'Good morning', group: 'Rygg', part: 'Nedre ryggen', img: 'Good_Morning' },

  // Triceps
  { id: 'triceps-overhead', name: 'Tricepsextension över huvudet', group: 'Triceps', part: 'Långa huvudet', img: 'Cable_Rope_Overhead_Triceps_Extension' },
  { id: 'skullcrusher', name: 'Skullcrusher', group: 'Triceps', part: 'Långa huvudet', img: 'EZ-Bar_Skullcrusher' },
  { id: 'triceps-hantel-overhead', name: 'Tricepsextension med hantel', group: 'Triceps', part: 'Långa huvudet', img: 'Standing_Dumbbell_Triceps_Extension' },
  { id: 'triceps-pushdown', name: 'Triceps pushdown', group: 'Triceps', part: 'Yttre huvudet', img: 'Triceps_Pushdown' },
  { id: 'triceps-rep', name: 'Triceps pushdown med rep', group: 'Triceps', part: 'Yttre huvudet', img: 'Triceps_Pushdown_-_Rope_Attachment' },
  { id: 'dips', name: 'Dips', group: 'Triceps', part: 'Yttre huvudet', img: 'Dips_-_Triceps_Version' },
  { id: 'triceps-omvant', name: 'Pushdown med omvänt grepp', group: 'Triceps', part: 'Inre huvudet', img: 'Reverse_Grip_Triceps_Pushdown' },
  { id: 'bankpress-smalt', name: 'Bänkpress med smalt grepp', group: 'Triceps', part: 'Inre huvudet', img: 'Close-Grip_Barbell_Bench_Press' },
  { id: 'tate-press', name: 'Tate press', group: 'Triceps', part: 'Inre huvudet', img: 'Tate_Press' },
  { id: 'kickbacks', name: 'Kickbacks med hantel', group: 'Triceps', part: 'Inre huvudet', img: 'Tricep_Dumbbell_Kickback' },
  { id: 'bankdips', name: 'Bänkdips', group: 'Triceps', part: 'Inre huvudet', img: 'Bench_Dips' },

  // Bröst
  { id: 'hantelpress-lutande', name: 'Lutande hantelpress', group: 'Bröst', part: 'Övre bröstet', img: 'Incline_Dumbbell_Press' },
  { id: 'lutande-bankpress', name: 'Lutande bänkpress', group: 'Bröst', part: 'Övre bröstet', img: 'Barbell_Incline_Bench_Press_-_Medium_Grip' },
  { id: 'lutande-flyes', name: 'Lutande hantelflyes', group: 'Bröst', part: 'Övre bröstet', img: 'Incline_Dumbbell_Flyes' },
  { id: 'bankpress', name: 'Bänkpress', group: 'Bröst', part: 'Mitten av bröstet', img: 'Barbell_Bench_Press_-_Medium_Grip' },
  { id: 'hantelpress', name: 'Hantelpress', group: 'Bröst', part: 'Mitten av bröstet', img: 'Dumbbell_Bench_Press' },
  { id: 'brostpress-maskin', name: 'Bröstpress i maskin', group: 'Bröst', part: 'Mitten av bröstet', img: 'Machine_Bench_Press' },
  { id: 'hantelflyes', name: 'Hantelflyes', group: 'Bröst', part: 'Mitten av bröstet', img: 'Dumbbell_Flyes' },
  { id: 'butterfly', name: 'Butterfly', group: 'Bröst', part: 'Mitten av bröstet', img: 'Butterfly' },
  { id: 'flyes-kabel', name: 'Flyes i kabel uppifrån och ned', group: 'Bröst', part: 'Nedre bröstet', img: 'Cable_Crossover' },
  { id: 'dips-brost', name: 'Dips för bröstet', group: 'Bröst', part: 'Nedre bröstet', img: 'Dips_-_Chest_Version' },
  { id: 'nedatlutande-hantelpress', name: 'Nedåtlutande hantelpress', group: 'Bröst', part: 'Nedre bröstet', img: 'Decline_Dumbbell_Bench_Press' },

  // Biceps
  { id: 'lutande-hantelcurl', name: 'Lutande hantelcurl', group: 'Biceps', part: 'Långa huvudet', img: 'Incline_Dumbbell_Curl' },
  { id: 'stangcurl-smalt', name: 'Stångcurl med smalt grepp', group: 'Biceps', part: 'Långa huvudet', img: 'Close-Grip_Standing_Barbell_Curl' },
  { id: 'bicepscurl', name: 'Bicepscurl med hantlar', group: 'Biceps', part: 'Långa huvudet', img: 'Dumbbell_Bicep_Curl' },
  { id: 'kabelcurl', name: 'Bicepscurl i kabel', group: 'Biceps', part: 'Långa huvudet', img: 'Standing_Biceps_Cable_Curl' },
  { id: 'preachercurl', name: 'Preachercurl', group: 'Biceps', part: 'Korta huvudet', img: 'Preacher_Curl' },
  { id: 'koncentrationscurl', name: 'Koncentrationscurl', group: 'Biceps', part: 'Korta huvudet', img: 'Concentration_Curls' },
  { id: 'stangcurl-brett', name: 'Stångcurl med brett grepp', group: 'Biceps', part: 'Korta huvudet', img: 'Wide-Grip_Standing_Barbell_Curl' },
  { id: 'stangcurl', name: 'Stångcurl', group: 'Biceps', part: 'Korta huvudet', img: 'Barbell_Curl' },
  { id: 'hammarcurl', name: 'Hammarcurl', group: 'Biceps', part: 'Underarmen – brachialis', img: 'Hammer_Curls' },
  { id: 'hammarcurl-rep', name: 'Hammarcurl med rep i kabel', group: 'Biceps', part: 'Underarmen – brachialis', img: 'Cable_Hammer_Curls_-_Rope_Attachment' },
  { id: 'omvand-stangcurl', name: 'Stångcurl med omvänt grepp', group: 'Biceps', part: 'Underarmen – brachialis', img: 'Reverse_Barbell_Curl' },

  // Ben
  { id: 'knaboj', name: 'Knäböj', group: 'Ben', part: 'Framsida lår', img: 'Barbell_Squat' },
  { id: 'benpress', name: 'Benpress', group: 'Ben', part: 'Framsida lår', img: 'Leg_Press' },
  { id: 'benspark', name: 'Benspark', group: 'Ben', part: 'Framsida lår', img: 'Leg_Extensions' },
  { id: 'bencurl', name: 'Liggande bencurl', group: 'Ben', part: 'Baksida lår', img: 'Lying_Leg_Curls' },
  { id: 'rumanskt-marklyft', name: 'Rumänskt marklyft', group: 'Ben', part: 'Baksida lår', img: 'Romanian_Deadlift' },
  { id: 'sittande-bencurl', name: 'Sittande bencurl', group: 'Ben', part: 'Baksida lår', img: 'Seated_Leg_Curl' },
  { id: 'hoftlyft', name: 'Höftlyft med stång', group: 'Ben', part: 'Sätet', img: 'Barbell_Hip_Thrust' },
  { id: 'utfall', name: 'Utfall med hantlar', group: 'Ben', part: 'Sätet', img: 'Dumbbell_Lunges' },
  { id: 'bulgarisk-utfall', name: 'Bulgariska utfall', group: 'Ben', part: 'Sätet', img: 'Split_Squat_with_Dumbbells' },

  // Mage
  { id: 'cable-crunch', name: 'Cable crunch', group: 'Mage', part: 'Övre magen', img: 'Cable_Crunch' },
  { id: 'magmaskin', name: 'Crunch i maskin', group: 'Mage', part: 'Övre magen', img: 'Ab_Crunch_Machine' },
  { id: 'crunches', name: 'Crunches', group: 'Mage', part: 'Övre magen', img: 'Crunches' },
  { id: 'hangande-benlyft', name: 'Hängande benlyft', group: 'Mage', part: 'Nedre magen', img: 'Hanging_Leg_Raise' },
  { id: 'omvand-crunch', name: 'Omvänd crunch', group: 'Mage', part: 'Nedre magen', img: 'Reverse_Crunch' },
  { id: 'liggande-benlyft', name: 'Liggande benlyft', group: 'Mage', part: 'Nedre magen', img: 'Flat_Bench_Lying_Leg_Raise' },
  { id: 'pallof', name: 'Pallof press', group: 'Mage', part: 'Sneda magmusklerna', img: 'Pallof_Press' },
  { id: 'russian-twist', name: 'Russian twist', group: 'Mage', part: 'Sneda magmusklerna', img: 'Russian_Twist' },
  { id: 'sneda-crunches', name: 'Sneda crunches', group: 'Mage', part: 'Sneda magmusklerna', img: 'Oblique_Crunches' },
  { id: 'plankan', name: 'Plankan', group: 'Mage', part: 'Hela bålen', img: 'Plank', unit: 'sek', defaultReps: 30 },
];

// Veckoschemat. "day": 1 = måndag … 5 = fredag (6 = lördag, 0 = söndag).
const SCHEDULE = [
  { day: 1, name: 'Måndag', groups: ['Axlar', 'Vader'] },
  { day: 2, name: 'Tisdag', groups: ['Rygg', 'Triceps'] },
  { day: 3, name: 'Onsdag', groups: ['Bröst', 'Biceps'] },
  { day: 5, name: 'Fredag', groups: ['Ben', 'Mage'] },
];

// Treveckorsrotation: 3 övningar per muskelgrupp och vecka – en för varje del av muskeln.
// Rad 1 = vecka 1, rad 2 = vecka 2, rad 3 = vecka 3.
const ROTATION = {
  Axlar: [
    ['axelpress', 'sidolyft', 'omvanda-flyes'],
    ['axelpress-maskin', 'sidolyft-kabel', 'face-pulls'],
    ['arnoldpress', 'sidolyft-sittande', 'bakre-delt-kabel'],
  ],
  Vader: [
    ['vadpress', 'vadpress-benpress', 'sittande-vadpress'],
    ['vadpress-hantel', 'asnevadpress', 'sittande-vadpress-hantel'],
    ['vadpress-stang', 'vadpress-benpress', 'sittande-vadpress-stang'],
  ],
  Rygg: [
    ['latsdrag', 'sittande-rodd', 'ryggresningar'],
    ['chins', 'hantelrodd', 'marklyft'],
    ['latsdrag-smalt', 't-bar-rodd', 'good-morning'],
  ],
  Triceps: [
    ['triceps-overhead', 'triceps-pushdown', 'triceps-omvant'],
    ['skullcrusher', 'triceps-rep', 'bankpress-smalt'],
    ['triceps-hantel-overhead', 'dips', 'tate-press'],
  ],
  Bröst: [
    ['hantelpress-lutande', 'bankpress', 'flyes-kabel'],
    ['lutande-bankpress', 'hantelpress', 'dips-brost'],
    ['lutande-flyes', 'brostpress-maskin', 'nedatlutande-hantelpress'],
  ],
  Biceps: [
    ['lutande-hantelcurl', 'preachercurl', 'hammarcurl'],
    ['stangcurl-smalt', 'koncentrationscurl', 'hammarcurl-rep'],
    ['bicepscurl', 'stangcurl-brett', 'omvand-stangcurl'],
  ],
  Ben: [
    ['knaboj', 'bencurl', 'hoftlyft'],
    ['benpress', 'rumanskt-marklyft', 'utfall'],
    ['benspark', 'sittande-bencurl', 'bulgarisk-utfall'],
  ],
  Mage: [
    ['cable-crunch', 'hangande-benlyft', 'pallof'],
    ['magmaskin', 'omvand-crunch', 'russian-twist'],
    ['crunches', 'liggande-benlyft', 'sneda-crunches'],
  ],
};
