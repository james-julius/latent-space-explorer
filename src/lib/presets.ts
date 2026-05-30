export interface Preset {
  name: string
  emoji: string
  texts: string[]
}

export const PRESETS: Preset[] = [
  {
    name: 'Emotions',
    emoji: '🎭',
    texts: [
      'joy and happiness', 'deep sadness', 'overwhelming anger', 'quiet contentment',
      'anxious fear', 'surprised wonder', 'bitter disgust', 'tender love',
      'burning envy', 'proud achievement', 'lonely isolation', 'hopeful anticipation',
      'nostalgic longing', 'peaceful serenity', 'frustrated helplessness',
    ],
  },
  {
    name: 'Concepts',
    emoji: '🧠',
    texts: [
      'artificial intelligence', 'quantum mechanics', 'evolutionary biology',
      'economic inequality', 'climate change', 'democracy and freedom',
      'consciousness and mind', 'black holes', 'language and meaning',
      'love and attachment', 'death and mortality', 'justice and fairness',
      'creativity and art', 'mathematics and logic', 'chaos and order',
    ],
  },
  {
    name: 'Code',
    emoji: '💻',
    texts: [
      'recursive function', 'database index', 'REST API endpoint',
      'machine learning model', 'binary search tree', 'async await promise',
      'dependency injection', 'microservices architecture', 'SQL query join',
      'git merge conflict', 'memory leak bug', 'unit test coverage',
      'continuous integration', 'type system inference', 'garbage collector',
    ],
  },
  {
    name: 'Places',
    emoji: '🌍',
    texts: [
      'tropical rainforest', 'arctic tundra', 'bustling city centre',
      'quiet mountain village', 'sandy desert dunes', 'deep ocean trench',
      'medieval castle ruins', 'modern airport terminal', 'ancient temple',
      'suburban shopping mall', 'rural farmland', 'volcanic island',
      'underground cave system', 'floating market', 'space station',
    ],
  },
  {
    name: 'Words',
    emoji: '📖',
    texts: [
      'king', 'queen', 'man', 'woman', 'child',
      'dog', 'cat', 'fish', 'bird', 'tree',
      'water', 'fire', 'earth', 'sky', 'stone',
    ],
  },
]
