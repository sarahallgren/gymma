// Övningsbibliotek och färdiga pass.
// Lägg till eller ändra övningar här. "id" måste vara unikt och får inte ändras
// efter att du loggat pass, eftersom historiken pekar på det.

const GROUPS = ['Ben', 'Rygg', 'Bröst', 'Axlar', 'Armar', 'Bål'];

const EXERCISES = [
  { id: 'knaboj', name: 'Knäböj', group: 'Ben' },
  { id: 'benpress', name: 'Benpress', group: 'Ben' },
  { id: 'rumanskt-marklyft', name: 'Rumänskt marklyft', group: 'Ben' },
  { id: 'utfall', name: 'Utfall med hantlar', group: 'Ben' },
  { id: 'bencurl', name: 'Bencurl', group: 'Ben' },
  { id: 'benspark', name: 'Benspark', group: 'Ben' },
  { id: 'vadpress', name: 'Vadpress', group: 'Ben' },

  { id: 'marklyft', name: 'Marklyft', group: 'Rygg' },
  { id: 'latsdrag', name: 'Latsdrag', group: 'Rygg' },
  { id: 'sittande-rodd', name: 'Sittande rodd', group: 'Rygg' },
  { id: 'hantelrodd', name: 'Hantelrodd', group: 'Rygg' },
  { id: 'chins', name: 'Chins', group: 'Rygg' },

  { id: 'bankpress', name: 'Bänkpress', group: 'Bröst' },
  { id: 'hantelpress-lutande', name: 'Lutande hantelpress', group: 'Bröst' },
  { id: 'brostpress-maskin', name: 'Bröstpress i maskin', group: 'Bröst' },
  { id: 'flyes-kabel', name: 'Flyes i kabel', group: 'Bröst' },

  { id: 'axelpress', name: 'Axelpress med hantlar', group: 'Axlar' },
  { id: 'sidolyft', name: 'Sidolyft', group: 'Axlar' },
  { id: 'face-pulls', name: 'Face pulls', group: 'Axlar' },

  { id: 'bicepscurl', name: 'Bicepscurl', group: 'Armar' },
  { id: 'hammarcurl', name: 'Hammarcurl', group: 'Armar' },
  { id: 'triceps-pushdown', name: 'Triceps pushdown', group: 'Armar' },

  { id: 'pallof', name: 'Pallof press', group: 'Bål' },
  { id: 'cable-crunch', name: 'Cable crunch', group: 'Bål' },
  { id: 'hangande-benlyft', name: 'Hängande benlyft', group: 'Bål' },
];

const TEMPLATES = [
  {
    id: 'helkropp-a',
    name: 'Helkropp A',
    exercises: ['knaboj', 'bankpress', 'sittande-rodd', 'axelpress', 'pallof'],
  },
  {
    id: 'helkropp-b',
    name: 'Helkropp B',
    exercises: ['marklyft', 'latsdrag', 'hantelpress-lutande', 'utfall', 'bicepscurl', 'triceps-pushdown'],
  },
];
