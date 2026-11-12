// Övningsbibliotek, veckoschema och standardvärden.
// Lägg till eller ändra övningar här. "id" måste vara unikt och får inte ändras
// efter att du loggat pass, eftersom historiken pekar på det.
//
// Bilderna kommer från Free Exercise DB (public domain):
// https://github.com/yuhonas/free-exercise-db
// Varje övning har två bilder i mappen bilder/: <id>-0.jpg (start) och <id>-1.jpg (slut).
// Fältet "img" är övningens namn i Free Exercise DB.
// "unit: 'sek'" betyder att övningen mäts i sekunder i stället för reps.

// Standard när du lägger till en övning: 4 set med 12 reps
const DEFAULT_SETS = 4;
const DEFAULT_REPS = 12;

const GROUPS = ['Axlar', 'Vader', 'Rygg', 'Triceps', 'Bröst', 'Biceps', 'Ben', 'Mage'];

const EXERCISES = [
  // Axlar
  { id: 'axelpress', name: 'Axelpress med hantlar', group: 'Axlar', img: 'Dumbbell_Shoulder_Press' },
  { id: 'axelpress-maskin', name: 'Axelpress i maskin', group: 'Axlar', img: 'Leverage_Shoulder_Press' },
  { id: 'sidolyft', name: 'Sidolyft', group: 'Axlar', img: 'Side_Lateral_Raise' },
  { id: 'framlyft', name: 'Framåtlyft med hantlar', group: 'Axlar', img: 'Front_Dumbbell_Raise' },
  { id: 'omvanda-flyes', name: 'Omvända flyes', group: 'Axlar', img: 'Reverse_Flyes' },
  { id: 'face-pulls', name: 'Face pulls', group: 'Axlar', img: 'Face_Pull' },
  { id: 'shrugs', name: 'Shrugs med hantlar', group: 'Axlar', img: 'Dumbbell_Shrug' },

  // Vader
  { id: 'vadpress', name: 'Stående vadpress', group: 'Vader', img: 'Standing_Calf_Raises' },
  { id: 'sittande-vadpress', name: 'Sittande vadpress', group: 'Vader', img: 'Seated_Calf_Raise' },
  { id: 'vadpress-benpress', name: 'Vadpress i benpress', group: 'Vader', img: 'Calf_Press_On_The_Leg_Press_Machine' },

  // Rygg
  { id: 'latsdrag', name: 'Latsdrag', group: 'Rygg', img: 'Wide-Grip_Lat_Pulldown' },
  { id: 'latsdrag-smalt', name: 'Latsdrag med smalt grepp', group: 'Rygg', img: 'Close-Grip_Front_Lat_Pulldown' },
  { id: 'sittande-rodd', name: 'Sittande rodd', group: 'Rygg', img: 'Seated_Cable_Rows' },
  { id: 'hantelrodd', name: 'Hantelrodd', group: 'Rygg', img: 'One-Arm_Dumbbell_Row' },
  { id: 't-bar-rodd', name: 'T-bar-rodd', group: 'Rygg', img: 'T-Bar_Row_with_Handle' },
  { id: 'raka-armar-pulldown', name: 'Pulldown med raka armar', group: 'Rygg', img: 'Straight-Arm_Pulldown' },
  { id: 'marklyft', name: 'Marklyft', group: 'Rygg', img: 'Barbell_Deadlift' },
  { id: 'chins', name: 'Chins', group: 'Rygg', img: 'Chin-Up' },

  // Triceps
  { id: 'triceps-pushdown', name: 'Triceps pushdown', group: 'Triceps', img: 'Triceps_Pushdown' },
  { id: 'triceps-rep', name: 'Triceps pushdown med rep', group: 'Triceps', img: 'Triceps_Pushdown_-_Rope_Attachment' },
  { id: 'skullcrusher', name: 'Skullcrusher', group: 'Triceps', img: 'EZ-Bar_Skullcrusher' },
  { id: 'triceps-overhead', name: 'Tricepsextension över huvudet', group: 'Triceps', img: 'Cable_Rope_Overhead_Triceps_Extension' },
  { id: 'dips', name: 'Dips', group: 'Triceps', img: 'Dips_-_Triceps_Version' },
  { id: 'bankdips', name: 'Bänkdips', group: 'Triceps', img: 'Bench_Dips' },

  // Bröst
  { id: 'bankpress', name: 'Bänkpress', group: 'Bröst', img: 'Barbell_Bench_Press_-_Medium_Grip' },
  { id: 'lutande-bankpress', name: 'Lutande bänkpress', group: 'Bröst', img: 'Barbell_Incline_Bench_Press_-_Medium_Grip' },
  { id: 'hantelpress', name: 'Hantelpress', group: 'Bröst', img: 'Dumbbell_Bench_Press' },
  { id: 'hantelpress-lutande', name: 'Lutande hantelpress', group: 'Bröst', img: 'Incline_Dumbbell_Press' },
  { id: 'brostpress-maskin', name: 'Bröstpress i maskin', group: 'Bröst', img: 'Machine_Bench_Press' },
  { id: 'flyes-kabel', name: 'Flyes i kabel', group: 'Bröst', img: 'Cable_Crossover' },
  { id: 'hantelflyes', name: 'Hantelflyes', group: 'Bröst', img: 'Dumbbell_Flyes' },
  { id: 'butterfly', name: 'Butterfly', group: 'Bröst', img: 'Butterfly' },

  // Biceps
  { id: 'bicepscurl', name: 'Bicepscurl med hantlar', group: 'Biceps', img: 'Dumbbell_Bicep_Curl' },
  { id: 'stangcurl', name: 'Stångcurl', group: 'Biceps', img: 'Barbell_Curl' },
  { id: 'hammarcurl', name: 'Hammarcurl', group: 'Biceps', img: 'Hammer_Curls' },
  { id: 'preachercurl', name: 'Preachercurl', group: 'Biceps', img: 'Preacher_Curl' },
  { id: 'koncentrationscurl', name: 'Koncentrationscurl', group: 'Biceps', img: 'Concentration_Curls' },
  { id: 'kabelcurl', name: 'Bicepscurl i kabel', group: 'Biceps', img: 'Standing_Biceps_Cable_Curl' },

  // Ben
  { id: 'knaboj', name: 'Knäböj', group: 'Ben', img: 'Barbell_Squat' },
  { id: 'benpress', name: 'Benpress', group: 'Ben', img: 'Leg_Press' },
  { id: 'rumanskt-marklyft', name: 'Rumänskt marklyft', group: 'Ben', img: 'Romanian_Deadlift' },
  { id: 'utfall', name: 'Utfall med hantlar', group: 'Ben', img: 'Dumbbell_Lunges' },
  { id: 'benspark', name: 'Benspark', group: 'Ben', img: 'Leg_Extensions' },
  { id: 'bencurl', name: 'Bencurl', group: 'Ben', img: 'Lying_Leg_Curls' },

  // Mage
  { id: 'cable-crunch', name: 'Cable crunch', group: 'Mage', img: 'Cable_Crunch' },
  { id: 'magmaskin', name: 'Crunch i maskin', group: 'Mage', img: 'Ab_Crunch_Machine' },
  { id: 'crunches', name: 'Crunches', group: 'Mage', img: 'Crunches' },
  { id: 'hangande-benlyft', name: 'Hängande benlyft', group: 'Mage', img: 'Hanging_Leg_Raise' },
  { id: 'pallof', name: 'Pallof press', group: 'Mage', img: 'Pallof_Press' },
  { id: 'plankan', name: 'Plankan', group: 'Mage', img: 'Plank', unit: 'sek', defaultReps: 30 },
];

// Veckoschemat. "day": 1 = måndag … 5 = fredag (6 = lördag, 0 = söndag).
// Ändra övningarna fritt – de visas i den ordning de står här.
const TEMPLATES = [
  {
    id: 'mandag', day: 1, name: 'Måndag – axlar och vader',
    exercises: ['axelpress', 'sidolyft', 'framlyft', 'omvanda-flyes', 'vadpress', 'sittande-vadpress'],
  },
  {
    id: 'tisdag', day: 2, name: 'Tisdag – rygg och triceps',
    exercises: ['latsdrag', 'sittande-rodd', 'hantelrodd', 'triceps-pushdown', 'skullcrusher', 'triceps-overhead'],
  },
  {
    id: 'onsdag', day: 3, name: 'Onsdag – bröst och biceps',
    exercises: ['bankpress', 'hantelpress-lutande', 'flyes-kabel', 'bicepscurl', 'hammarcurl', 'preachercurl'],
  },
  {
    id: 'fredag', day: 5, name: 'Fredag – ben och mage',
    exercises: ['knaboj', 'benpress', 'rumanskt-marklyft', 'benspark', 'bencurl', 'cable-crunch', 'hangande-benlyft'],
  },
];
