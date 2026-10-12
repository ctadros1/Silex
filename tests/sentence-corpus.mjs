// Grammar regression fixtures. These exercise semantic compilation, not the
// accuracy of a downloaded model on arbitrary natural-language input.
export const categories={
  agreement:[
    'She has a dog.','He buys a book.','The child plays a game.','The child carries a ball.',
    'The child cries.','The bird flies.','The teacher teaches a child.','She watches the bird.',
    'He goes to the park.','I had a dog.','The child is happy and tired.',
    'She is not happy and tired.','I see its red door.','We have a house.'
  ],
  perception:[
    'I see the red bird take flight.','I watch a bird fly away.','I hear you sing.',
    'I saw the bird taking flight.','I see the child read a book.',
    'I see the red bird flying away.','I saw a blue bird flying away from the tree.',
    'I see you walking down the street.','You hear me singing quietly.',
    'She watches the cat jumping out of the window.','Every child sees a bird flying toward the river.',
    'I do not see the bird flying away.','Did you see the bird flying away?',
    'I see the teacher reading a book.','I see the bird flying up.'
  ],
  movement:[
    'The bird takes flight.','The bird took flight.','The bird is taking flight.',
    'The bird flies away.','The bird flew away.','The bird is flying away.',
    'The bird will fly back.','The cat jumps off.','The cat jumps into the box.',
    'The dog runs through the park.','The child walks along the river.',
    'I walk out of the room.','You run down.','I walk up the street.',
    'The bird flies away from the house.','The bird flies toward the tree.',
    'The child is swimming slowly.','I go to the school tomorrow.'
  ],
  questions:[
    'Do you see me?','Does the bird fly?','Did the child run?',
    'Will you help me?','Can the child swim?','Is the door open?',
    'Are the birds blue?','Was she tired?','Are you in the park?',
    'May I drink water?','Should you read the book?','Do you not see me?'
  ],
  negation:[
    'I do not see you.','She does not like coffee.','The bird did not fly away.',
    'I will not buy the car.','The door is not open.','Nobody sees me.',
    'No child sees a bird.','I cannot read the book.',"I don't see you.",
    "She isn't hungry.","The dog wasn't sleeping.","You won't see me."
  ],
  tense:[
    'I saw you.','The bird flew away.','The dog slept.',
    'We were reading a book.','I will see you.','She will be happy.',
    'I bought a car yesterday.','The child runs today.','The child will run tomorrow.',
    'I am reading the book now.','The door was closed.','I did read the book.'
  ],
  quantification:[
    'Every child sees a bird.','A child sees every bird.','Each scientist reads a book.',
    'No scientist sees a red bird.','Someone helps everyone.','Everybody sees somebody.',
    'The birds are red.','I see two birds.','Three children read the book.',
    'Every child sees three birds.','I have 12 books.','I see all the birds.'
  ],
  possession:[
    'My dog runs.','Your cat is happy.','His book is red.','Her phone is new.',
    'Our teacher reads a book.','Their house is big.','I need my phone.',
    "Alice's dog runs.","The child's book is red.",'I see your small blue bird.'
  ],
  transfer:[
    'I give you a book.','Alice gave me a book.','I give a book to the child.',
    'You send me a letter.','I sent a message to Bob.','The teacher gives every child a book.',
    'The teacher will give a book to every child.','I did not give you the book.'
  ],
  relative:[
    'Every child who sees a bird reads a book.','The person who helps me is happy.',
    'I see the bird that is red.','The child who reads a book runs.',
    'Every scientist who sees a red bird believes that I am happy.',
    'The bird that I see flies away.','I see a child who is reading a book.'
  ],
  nested:[
    'I believe that you see me.','You know that I do not see the bird.',
    'Every child believes that a scientist sees a bird.',
    'I think that you believe that the child sees a bird.',
    'If I see you, then you help me.','I am tired because I work.',
    'Although I am tired, I read the book.','I see a bird and you see a cat.',
    'I see a bird or you see a cat.','I believe that you see me and the child runs.'
  ],
  modality:[
    'I can read a book.','You may see me.','She might buy a car.',
    'Every child must read a book.','I should not drink coffee.',
    'You may not see me.','The bird cannot fly.','I must not drink water.',
    'I want to read a book.','The child tries to run.','The bird began to fly.',
    'I promised to help you.','She plans to buy a car.','I hope to see you.'
  ],
  passive:[
    'The book was read.','The car was bought by Alice.','The machine was built by the scientist.',
    'The door was opened.','The book was not read.','The child is helped by the teacher.'
  ],
  formatting:[
    '  I see you.  ','I   see   a   red   bird.',"I'm happy.","You're tired.",
    'I see YOU!','I see you','I see a bird in the park.',
    'The child is a person.','The red bird is on the table.','I am in the room.'
  ]
};
// Cross-products vary subject scope, tense/polarity, object scope, and event
// modifiers. Each generated sentence also goes through type and omission checks.
export const generated=[
  ...['I','You','A child','Every scientist','No person','The teacher'].flatMap(subject=>
    ['see','do not see','will see','may see','should not see','did see'].flatMap(verb=>
      ['a bird','the red bird','every child','my book','two blue birds'].map(object=>`${subject} ${!['I','You'].includes(subject)?verb==='see'?'sees':verb.replace(/^do /,'does '):verb} ${object}.`))),
  ...['A bird','The bird','Every bird','No bird'].flatMap(subject=>
    ['flies','flew','is flying','will fly'].flatMap(verb=>
      ['away','back','up','down','toward the tree','away from the house','through the park','out of the room'].map(modifier=>`${subject} ${verb} ${modifier}.`)))
];
