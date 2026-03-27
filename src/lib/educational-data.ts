
// src/lib/educational-data.ts

export const capsTopics = {
  'Foundation Phase': {
    'Home Language': [
      'Listening and Speaking: Sounds and Phonemes',
      'Reading and Phonics: Letter-Sound Relationships',
      'Handwriting: Forming Letters',
      'Writing: Simple Sentences',
    ],
    'Mathematics': [
      'Numbers, Operations and Relationships: Counting',
      'Patterns, Functions and Algebra: Geometric Patterns',
      'Space and Shape (Geometry): 2D Shapes',
      'Measurement: Time (Days of the Week)',
      'Data Handling: Collecting and Sorting Objects',
    ],
    'Life Skills': [
      'Beginning Knowledge and Personal and Social Well-being: About Me',
      'Creative Arts: Drawing and Painting',
      'Physical Education: Gross Motor Skills',
    ],
  },
  'Intermediate Phase': {
    'Social Sciences': [
        'History: Map Skills - Africa and the World',
        'Geography: Physical Features of South Africa',
        'History: Ancient Civilizations (e.g., Egypt)',
    ],
    'Natural Sciences and Technology': [
        'Life and Living: Plants and Animals on Earth',
        'Matter and Materials: Properties of Materials',
        'Energy and Change: Energy for Life',
        'Planet Earth and Beyond: The Solar System',
    ],
    'Mathematics': [
        'Numbers, Operations and Relationships: Common Fractions',
        'Patterns, Functions and Algebra: Investigating Number Patterns',
        'Space and Shape (Geometry): 3D Objects',
        'Measurement: Length and Perimeter',
        'Data Handling: Interpreting Bar Graphs',
    ],
  },
  'Senior Phase': {
    'Economic and Management Sciences': [
        'The Economy: Needs and Wants',
        'Financial Literacy: Budgets and Saving',
        'Entrepreneurship: Starting a Business',
    ],
    'Technology': [
        'Structures: Forces and Materials',
        'Mechanical Systems and Control: Levers and Gears',
        'Electrical Systems and Control: Circuits',
    ],
    'Creative Arts': [
        'Visual Arts: The Elements of Art (Line, Shape, Colour)',
        'Drama: Improvisation and Characterisation',
        'Music: Rhythm and Melody',
        'Dance: Exploring Different Dance Styles',
    ],
  },
  'FET Phase': {
    'Physical Sciences': [
        'Mechanics: Vectors, Scalars and Motion',
        'Waves, Sound and Light: Geometrical Optics',
        'Chemical Change: Stoichiometry',
        'Matter and Materials: The Periodic Table',
    ],
    'Life Sciences': [
        'The Chemistry of Life: Organic Molecules',
        'Cells: The Basic Units of Life',
        'Genetics and Inheritance: DNA and RNA',
        'Diversity, Change and Continuity: Biodiversity and Classification',
    ],
    'History': [
      'The Cold War: Origins and Global Impact',
      'Independent Africa: Comparative Case Studies',
      'Civil Society Protests: The US Civil Rights Movement',
      'The End of the Cold War and a New World Order',
    ],
  },
};

export const lessonTypes = [
    'Direct Instruction', 'Inquiry-Based Learning', 'Cooperative Learning',
    'Project-Based Learning', 'Game-Based Learning (Gamification)', 'Flipped Classroom'
];

export const subjectsByGrade = {
    'Foundation Phase': ['Home Language', 'Mathematics', 'Life Skills'],
    'Intermediate Phase': ['Social Sciences', 'Natural Sciences and Technology', 'Mathematics'],
    'Senior Phase': ['Economic and Management Sciences', 'Technology', 'Creative Arts'],
    'FET Phase': ['Physical Sciences', 'Life Sciences', 'History'],
};

export const grades = ['Foundation Phase', 'Intermediate Phase', 'Senior Phase', 'FET Phase'];
