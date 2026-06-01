// Curated seed corpus. Each scene is embedded + projected at build time by
// scripts/seed.mjs and shipped to public/scenes/. Terms are grouped by topic so
// the cloud has visible semantic structure; topicId travels with each point.
//
// Keep term order stable — the seed UMAP is deterministic given stable input.

export const SCENES = [
  {
    sceneId: 'concept-atlas',
    title: 'Concept Atlas',
    description: 'A broad tour of everyday meaning — emotions, nature, science, culture and more.',
    topics: [
      {
        topicId: 'emotions',
        label: 'Emotions',
        terms: [
          'joy', 'sorrow', 'anger', 'fear', 'love', 'hatred', 'jealousy', 'envy',
          'pride', 'shame', 'guilt', 'hope', 'despair', 'anxiety', 'calm', 'serenity',
          'excitement', 'boredom', 'curiosity', 'awe', 'disgust', 'contempt', 'gratitude',
          'loneliness', 'nostalgia', 'euphoria', 'melancholy', 'contentment', 'rage',
          'tenderness', 'longing', 'relief', 'embarrassment', 'compassion', 'grief',
        ],
      },
      {
        topicId: 'animals',
        label: 'Animals',
        terms: [
          'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'wolf', 'fox', 'bear',
          'rabbit', 'deer', 'horse', 'cow', 'sheep', 'goat', 'pig', 'dog', 'cat',
          'mouse', 'rat', 'squirrel', 'eagle', 'hawk', 'owl', 'sparrow', 'penguin',
          'dolphin', 'whale', 'shark', 'octopus', 'jellyfish', 'crab', 'lobster',
          'frog', 'snake', 'lizard', 'crocodile', 'turtle', 'butterfly', 'bee', 'ant',
          'spider', 'beetle', 'kangaroo', 'koala', 'panda', 'gorilla', 'chimpanzee',
        ],
      },
      {
        topicId: 'plants',
        label: 'Plants',
        terms: [
          'oak', 'pine', 'maple', 'willow', 'birch', 'redwood', 'palm', 'bamboo',
          'rose', 'tulip', 'daisy', 'sunflower', 'orchid', 'lily', 'lavender', 'jasmine',
          'fern', 'moss', 'cactus', 'ivy', 'clover', 'wheat', 'corn', 'rice', 'barley',
          'mushroom', 'algae', 'seaweed', 'vine', 'shrub', 'sapling', 'blossom',
        ],
      },
      {
        topicId: 'food',
        label: 'Food',
        terms: [
          'bread', 'cheese', 'butter', 'rice', 'pasta', 'noodles', 'soup', 'salad',
          'pizza', 'burger', 'sandwich', 'taco', 'sushi', 'curry', 'stew', 'roast',
          'apple', 'banana', 'orange', 'grape', 'mango', 'strawberry', 'pineapple',
          'tomato', 'potato', 'carrot', 'onion', 'garlic', 'pepper', 'mushroom',
          'chocolate', 'honey', 'sugar', 'salt', 'coffee', 'tea', 'wine', 'beer',
        ],
      },
      {
        topicId: 'colors',
        label: 'Colors',
        terms: [
          'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'purple',
          'pink', 'brown', 'black', 'white', 'gray', 'crimson', 'scarlet', 'turquoise',
          'teal', 'magenta', 'cyan', 'amber', 'gold', 'silver', 'bronze', 'ivory',
          'beige', 'maroon', 'navy', 'lavender', 'emerald', 'azure',
        ],
      },
      {
        topicId: 'science',
        label: 'Science',
        terms: [
          'atom', 'molecule', 'electron', 'proton', 'neutron', 'quark', 'photon',
          'gravity', 'energy', 'momentum', 'velocity', 'acceleration', 'force', 'mass',
          'entropy', 'thermodynamics', 'relativity', 'quantum', 'magnetism', 'voltage',
          'evolution', 'genetics', 'mitochondria', 'enzyme', 'protein', 'chromosome',
          'ecosystem', 'photosynthesis', 'bacteria', 'virus', 'neuron', 'synapse',
          'galaxy', 'nebula', 'supernova', 'blackhole', 'comet', 'asteroid', 'orbit',
        ],
      },
      {
        topicId: 'math',
        label: 'Mathematics',
        terms: [
          'number', 'integer', 'fraction', 'decimal', 'prime', 'infinity', 'zero',
          'addition', 'subtraction', 'multiplication', 'division', 'equation', 'variable',
          'function', 'derivative', 'integral', 'matrix', 'vector', 'geometry', 'algebra',
          'calculus', 'topology', 'probability', 'statistics', 'theorem', 'proof',
          'triangle', 'circle', 'square', 'polygon', 'angle', 'symmetry', 'logarithm',
        ],
      },
      {
        topicId: 'technology',
        label: 'Technology',
        terms: [
          'computer', 'algorithm', 'software', 'hardware', 'database', 'network',
          'internet', 'server', 'browser', 'encryption', 'compiler', 'function', 'variable',
          'array', 'pointer', 'recursion', 'cache', 'protocol', 'bandwidth', 'firewall',
          'robot', 'sensor', 'circuit', 'transistor', 'processor', 'memory', 'pixel',
          'satellite', 'laser', 'battery', 'antenna', 'microchip', 'bitcoin', 'cloud',
        ],
      },
      {
        topicId: 'music',
        label: 'Music',
        terms: [
          'melody', 'harmony', 'rhythm', 'tempo', 'chord', 'note', 'scale', 'octave',
          'piano', 'guitar', 'violin', 'cello', 'flute', 'trumpet', 'drums', 'saxophone',
          'symphony', 'concerto', 'sonata', 'opera', 'jazz', 'blues', 'rock', 'classical',
          'reggae', 'techno', 'choir', 'orchestra', 'lyric', 'verse', 'chorus', 'beat',
        ],
      },
      {
        topicId: 'sports',
        label: 'Sports',
        terms: [
          'soccer', 'basketball', 'baseball', 'tennis', 'golf', 'cricket', 'rugby',
          'hockey', 'volleyball', 'boxing', 'wrestling', 'swimming', 'cycling', 'running',
          'marathon', 'sprint', 'archery', 'fencing', 'skiing', 'surfing', 'climbing',
          'gymnastics', 'rowing', 'sailing', 'skateboard', 'referee', 'stadium', 'trophy',
        ],
      },
      {
        topicId: 'geography',
        label: 'Geography',
        terms: [
          'mountain', 'valley', 'river', 'ocean', 'lake', 'desert', 'forest', 'jungle',
          'island', 'peninsula', 'canyon', 'glacier', 'volcano', 'waterfall', 'plateau',
          'prairie', 'tundra', 'savanna', 'reef', 'delta', 'coast', 'cliff', 'cave',
          'continent', 'equator', 'hemisphere', 'latitude', 'longitude', 'horizon',
        ],
      },
      {
        topicId: 'weather',
        label: 'Weather',
        terms: [
          'rain', 'snow', 'storm', 'thunder', 'lightning', 'hurricane', 'tornado',
          'blizzard', 'drought', 'flood', 'fog', 'mist', 'breeze', 'gale', 'cloud',
          'sunshine', 'rainbow', 'frost', 'hail', 'humidity', 'monsoon', 'cyclone',
          'drizzle', 'sleet', 'overcast', 'heatwave', 'windchill', 'pressure',
        ],
      },
      {
        topicId: 'professions',
        label: 'Professions',
        terms: [
          'doctor', 'nurse', 'teacher', 'engineer', 'lawyer', 'judge', 'scientist',
          'artist', 'musician', 'writer', 'architect', 'chef', 'farmer', 'pilot',
          'sailor', 'soldier', 'firefighter', 'police', 'plumber', 'electrician',
          'carpenter', 'mechanic', 'accountant', 'banker', 'journalist', 'photographer',
          'designer', 'programmer', 'astronaut', 'detective', 'surgeon', 'professor',
        ],
      },
      {
        topicId: 'abstract',
        label: 'Abstract ideas',
        terms: [
          'truth', 'beauty', 'justice', 'freedom', 'wisdom', 'knowledge', 'power',
          'time', 'space', 'reality', 'consciousness', 'identity', 'memory', 'dream',
          'destiny', 'chaos', 'order', 'balance', 'change', 'meaning', 'purpose',
          'morality', 'ethics', 'virtue', 'courage', 'patience', 'humility', 'ambition',
          'faith', 'doubt', 'reason', 'imagination', 'creativity', 'logic', 'paradox',
        ],
      },
      {
        topicId: 'materials',
        label: 'Materials',
        terms: [
          'wood', 'stone', 'metal', 'iron', 'steel', 'copper', 'gold', 'silver',
          'glass', 'plastic', 'rubber', 'leather', 'cotton', 'wool', 'silk', 'paper',
          'ceramic', 'clay', 'concrete', 'marble', 'granite', 'diamond', 'crystal',
          'aluminum', 'titanium', 'bronze', 'wax', 'foam', 'fabric', 'sand',
        ],
      },
      {
        topicId: 'vehicles',
        label: 'Vehicles',
        terms: [
          'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train', 'tram', 'subway',
          'airplane', 'helicopter', 'rocket', 'ship', 'boat', 'submarine', 'yacht',
          'canoe', 'ferry', 'tractor', 'ambulance', 'taxi', 'van', 'scooter', 'glider',
          'spacecraft', 'sled', 'wagon', 'carriage',
        ],
      },
      {
        topicId: 'mythology',
        label: 'Mythology',
        terms: [
          'dragon', 'phoenix', 'unicorn', 'griffin', 'mermaid', 'centaur', 'minotaur',
          'sphinx', 'kraken', 'cyclops', 'titan', 'oracle', 'prophecy', 'destiny',
          'olympus', 'underworld', 'valhalla', 'pharaoh', 'wizard', 'sorcerer', 'witch',
          'goblin', 'troll', 'fairy', 'elf', 'dwarf', 'ghost', 'demon', 'angel',
        ],
      },
      {
        topicId: 'body',
        label: 'The body',
        terms: [
          'heart', 'brain', 'lung', 'liver', 'kidney', 'stomach', 'muscle', 'bone',
          'skin', 'blood', 'nerve', 'spine', 'skull', 'rib', 'hand', 'finger', 'arm',
          'leg', 'foot', 'knee', 'elbow', 'shoulder', 'eye', 'ear', 'nose', 'mouth',
          'tongue', 'tooth', 'hair', 'throat', 'chest', 'pulse', 'breath',
        ],
      },
    ],
  },
]
