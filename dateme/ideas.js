// The built-in date idea library. No DOM here, so it also loads under Node for tests.
//
// Each idea: idea(id, emoji, title, description, tags)
//   id        unique, lowercase-with-dashes. Saved lists remember ideas by id, so never reuse one.
//   desc      one or two short sentences. "{city}" becomes the person's city (or "town").
// Tags (lists are space-separated words):
//   cost      0 free, 1 $ (under $20), 2 $$ ($20–60), 3 $$$ ($60+), for the two of you
//   mins      about how long it takes
//   setting   indoor | outdoor | either
//   times     morning afternoon evening night, or "any"
//   travel    0 at home, 1 close by (~15 min), 2 a short drive (~45 min), 3 a day trip
//   adventure 0 chill … 1 adventurous      active 0 low-key … 1 active
//   crowd     0 quiet … 1 crowds           food   0 not about food … 1 all about food
//   interests artsy sporty nerdy musical outdoorsy gamer
//   love      words quality gifts acts touch (the love languages it speaks)
//   near      needs at least one of: water beach trails downtown snow farms
//   months    only offered in these months (1–12, northern hemisphere; flipped south of the equator)
//   foods     a disliked food that rules it out: seafood spicy meat dairy gluten sweets coffee
//   minAge    hidden below this age (21 for anything with alcohol, 18 for overnights and 18+ venues)
//   bestWhen  rain | snow | hot  — gets a boost when today's weather matches
(function (root) {
  "use strict";

  const IDEAS = [];
  function idea(id, emoji, title, desc, tags) {
    IDEAS.push(Object.assign({ id, emoji, title, desc }, tags));
  }

  // ---------- Outdoors and nature ----------
  idea("sunrise-hike", "🌄", "Sunrise hike",
    "Start in the dark and reach the top as the sky turns pink. Bring a thermos of something warm to share.",
    { cost: 0, mins: 180, setting: "outdoor", times: "morning", travel: 2, adventure: .7, active: .9, crowd: .1,
      interests: "outdoorsy sporty", love: "quality", near: "trails" });
  idea("sunset-picnic", "🧺", "Sunset picnic",
    "Pack their favorite snacks and a blanket, find a spot facing west, and stay until the first star shows up.",
    { cost: 1, mins: 120, setting: "outdoor", times: "evening", travel: 1, adventure: .2, active: .2, crowd: .3, food: .5,
      interests: "outdoorsy", love: "quality acts" });
  idea("stargazing", "🌌", "Stargazing drive",
    "Drive out past the city lights, open a free star map app, and try to find Saturn together.",
    { cost: 0, mins: 150, setting: "outdoor", times: "night", travel: 2, adventure: .4, active: .1, crowd: 0,
      interests: "nerdy outdoorsy", love: "touch quality" });
  idea("botanical-garden", "🌺", "Botanical garden stroll",
    "Wander the paths, each pick a favorite plant in every section, then argue about which one wins.",
    { cost: 1, mins: 120, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .2, active: .3, crowd: .4,
      interests: "artsy outdoorsy", love: "quality" });
  idea("waterfall-hunt", "💦", "Waterfall hunt",
    "Look up the closest waterfall trail, pack lunch, and make it your mission for the day.",
    { cost: 0, mins: 300, setting: "outdoor", times: "morning afternoon", travel: 3, adventure: .8, active: .8, crowd: .2,
      interests: "outdoorsy sporty", love: "quality", near: "trails" });
  idea("bike-to-breakfast", "🚲", "Bike to breakfast",
    "Pick a café a few miles away, ride there together, and earn those pancakes.",
    { cost: 1, mins: 150, setting: "outdoor", times: "morning", travel: 1, adventure: .4, active: .8, crowd: .4, food: .5,
      interests: "sporty outdoorsy", love: "quality" });
  idea("kayak", "🛶", "Rent a kayak or canoe",
    "Paddle out, drift a while, and try very hard not to tip over.",
    { cost: 2, mins: 180, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .7, active: .8, crowd: .2,
      interests: "outdoorsy sporty", love: "quality", near: "water beach", months: "5 6 7 8 9" });
  idea("paddleboard", "🏄", "Paddleboard lesson",
    "Take a beginner lesson together. Whoever falls in first buys snacks.",
    { cost: 2, mins: 150, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .8, active: .8, crowd: .3,
      interests: "sporty outdoorsy", love: "quality", near: "water beach", months: "6 7 8 9" });
  idea("beach-day", "🏖️", "Beach day",
    "Towels, sunscreen, a speaker, and a cooler. Build the most dramatic sandcastle on the beach.",
    { cost: 0, mins: 300, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .3, active: .5, crowd: .7,
      interests: "outdoorsy", love: "quality touch", near: "beach", months: "5 6 7 8 9", bestWhen: "hot" });
  idea("lake-day", "🏊", "Lake day",
    "Find a swimming spot, bring floaties and snacks, and spend the whole afternoon in the water.",
    { cost: 0, mins: 240, setting: "outdoor", times: "afternoon", travel: 2, adventure: .4, active: .6, crowd: .4,
      interests: "outdoorsy sporty", love: "quality", near: "water", months: "6 7 8", bestWhen: "hot" });
  idea("tide-pools", "🦀", "Tide pooling",
    "Check the tide chart, go at low tide, and see who can spot the most sea stars and crabs.",
    { cost: 0, mins: 120, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .5, active: .5, crowd: .2,
      interests: "nerdy outdoorsy", love: "quality", near: "beach" });
  idea("fishing", "🎣", "Go fishing",
    "Grab a cheap rod and some bait. Catching anything is a bonus; the quiet time is the point.",
    { cost: 1, mins: 180, setting: "outdoor", times: "morning", travel: 2, adventure: .3, active: .3, crowd: .1,
      interests: "outdoorsy", love: "quality", near: "water beach" });
  idea("backyard-campout", "⛺", "Backyard campout",
    "Pitch a tent in the yard (or a blanket fort in the living room), tell scary stories, and make s'mores.",
    { cost: 0, mins: 240, setting: "either", times: "evening night", travel: 0, adventure: .4, active: .2, crowd: 0, food: .3,
      interests: "outdoorsy", love: "quality touch", foods: "sweets" });
  idea("camping-trip", "🏕️", "Overnight camping trip",
    "Book a campsite, cook dinner over a fire, and wake up somewhere new.",
    { cost: 2, mins: 1440, setting: "outdoor", times: "afternoon", travel: 3, adventure: .8, active: .7, crowd: .1,
      interests: "outdoorsy", love: "quality touch", near: "trails water", months: "5 6 7 8 9 10", minAge: 18 });
  idea("geocaching", "📍", "Geocaching treasure hunt",
    "Use the free app to find hidden boxes around {city}. Sign the logbooks with a couple name.",
    { cost: 0, mins: 120, setting: "outdoor", times: "morning afternoon", travel: 1, adventure: .6, active: .6, crowd: .1,
      interests: "nerdy outdoorsy gamer", love: "quality" });
  idea("bird-watching", "🐦", "Bird-watching walk",
    "Borrow binoculars, open a free bird ID app, and count how many kinds you can spot in an hour.",
    { cost: 0, mins: 90, setting: "outdoor", times: "morning", travel: 1, adventure: .2, active: .3, crowd: 0,
      interests: "nerdy outdoorsy", love: "quality" });
  idea("photo-walk", "📸", "Photo prompt walk",
    "Each write five photo prompts for the other (\"something tiny\", \"something that looks like me\"). Trade and shoot.",
    { cost: 0, mins: 120, setting: "outdoor", times: "afternoon evening", travel: 1, adventure: .4, active: .4, crowd: .4,
      interests: "artsy", love: "quality words" });
  idea("cloud-watching", "☁️", "Cloud watching",
    "Lie on a blanket in the grass and name every cloud. Snacks required.",
    { cost: 0, mins: 60, setting: "outdoor", times: "afternoon", travel: 1, adventure: 0, active: 0, crowd: .1,
      interests: "outdoorsy", love: "touch quality" });
  idea("scenic-drive", "🚗", "Scenic drive with a playlist swap",
    "Each make a 10-song playlist for the other, then take a road you've never driven and play them on the way.",
    { cost: 1, mins: 180, setting: "either", times: "afternoon evening", travel: 3, adventure: .5, active: .1, crowd: .1,
      interests: "musical", love: "words gifts quality" });
  idea("farmers-market", "🥕", "Farmers market morning",
    "Wander the stalls, try the samples, and each buy the other one small thing under $5.",
    { cost: 1, mins: 90, setting: "outdoor", times: "morning", travel: 1, adventure: .3, active: .3, crowd: .7, food: .6,
      interests: "outdoorsy", love: "gifts quality", months: "4 5 6 7 8 9 10" });
  idea("hammock-park", "🌳", "Hammock and a book",
    "String up a hammock in the park, bring two books, and read side by side.",
    { cost: 0, mins: 120, setting: "outdoor", times: "afternoon", travel: 1, adventure: 0, active: 0, crowd: .2,
      interests: "outdoorsy nerdy", love: "quality touch", months: "4 5 6 7 8 9 10" });
  idea("disc-golf", "🥏", "Disc golf",
    "Most parks have a free course. Keep score and make the loser carry the discs.",
    { cost: 0, mins: 120, setting: "outdoor", times: "morning afternoon evening", travel: 1, adventure: .4, active: .6, crowd: .3,
      interests: "sporty outdoorsy gamer", love: "quality" });
  idea("fly-a-kite", "🪁", "Fly a kite",
    "Get a cheap kite (or build one) and take it to the windiest open field you can find.",
    { cost: 1, mins: 90, setting: "outdoor", times: "afternoon", travel: 1, adventure: .3, active: .5, crowd: .3,
      interests: "outdoorsy artsy", love: "quality" });
  idea("nature-scavenger", "🔍", "Nature scavenger hunt",
    "Make a list: a heart-shaped rock, a feather, three colors of leaves. First to find everything picks dinner.",
    { cost: 0, mins: 90, setting: "outdoor", times: "morning afternoon", travel: 1, adventure: .4, active: .5, crowd: .1,
      interests: "outdoorsy gamer", love: "quality gifts" });
  idea("sunset-spot", "🌇", "Find the best sunset spot",
    "A hill, a parking garage roof, a dock. Get there early, bring hoodies, and watch it go down.",
    { cost: 0, mins: 60, setting: "outdoor", times: "evening", travel: 1, adventure: .3, active: .2, crowd: .2,
      interests: "outdoorsy artsy", love: "touch quality" });
  idea("full-moon-walk", "🌕", "Full moon walk",
    "Check when the next full moon is and take a long walk without flashlights.",
    { cost: 0, mins: 60, setting: "outdoor", times: "night", travel: 1, adventure: .4, active: .4, crowd: .1,
      interests: "outdoorsy", love: "touch quality" });
  idea("meteor-shower", "☄️", "Meteor shower night",
    "Look up the peak night, drive somewhere dark, lie on blankets, and count shooting stars.",
    { cost: 0, mins: 150, setting: "outdoor", times: "night", travel: 2, adventure: .5, active: .1, crowd: .1,
      interests: "nerdy outdoorsy", love: "touch quality", months: "8 12" });
  idea("bonfire", "🔥", "Bonfire and s'mores",
    "Find a fire pit (or a park that allows one), bring marshmallows, and stay until the embers die.",
    { cost: 1, mins: 150, setting: "outdoor", times: "evening night", travel: 1, adventure: .3, active: .2, crowd: .2, food: .3,
      interests: "outdoorsy", love: "touch quality", months: "9 10 11 3 4", foods: "sweets" });
  idea("rain-walk", "☔", "Rain walk with one umbrella",
    "Only one umbrella allowed. Jump in at least one puddle. Hot drinks after.",
    { cost: 0, mins: 45, setting: "outdoor", times: "any", travel: 1, adventure: .5, active: .4, crowd: .1,
      interests: "outdoorsy", love: "touch", bestWhen: "rain" });
  idea("wildflower-walk", "🌸", "Wildflower or cherry blossom walk",
    "Find where things are blooming right now and go see it before it's gone.",
    { cost: 0, mins: 120, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .3, active: .4, crowd: .4,
      interests: "artsy outdoorsy", love: "quality", months: "3 4 5" });
  idea("leaf-peeping", "🍂", "Fall leaves walk",
    "Find the most colorful trail in the area and collect the best leaf you see.",
    { cost: 0, mins: 120, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .3, active: .5, crowd: .3,
      interests: "outdoorsy artsy", love: "quality", months: "10 11" });
  idea("hot-springs", "♨️", "Hot springs soak",
    "Find natural or resort hot springs nearby and soak until you're both completely melted.",
    { cost: 2, mins: 240, setting: "outdoor", times: "afternoon evening", travel: 3, adventure: .5, active: .1, crowd: .3,
      interests: "outdoorsy", love: "touch quality", near: "trails" });
  idea("horseback", "🐴", "Horseback trail ride",
    "Book a beginner trail ride. Name your horses something ridiculous.",
    { cost: 3, mins: 180, setting: "outdoor", times: "morning afternoon", travel: 3, adventure: .8, active: .6, crowd: .2,
      interests: "outdoorsy", love: "quality", near: "trails farms" });
  idea("ropes-course", "🌲", "Treetop ropes course",
    "Harness up and zipline through the trees. Cheer each other across the wobbly bridges.",
    { cost: 3, mins: 180, setting: "outdoor", times: "morning afternoon", travel: 3, adventure: 1, active: .9, crowd: .4,
      interests: "sporty outdoorsy", love: "quality" });
  idea("tubing", "🛟", "River tubing",
    "Rent tubes, tie them together, and float lazily down the river.",
    { cost: 1, mins: 180, setting: "outdoor", times: "afternoon", travel: 2, adventure: .7, active: .4, crowd: .6,
      interests: "outdoorsy", love: "quality touch", near: "water", months: "6 7 8", bestWhen: "hot" });
  idea("park-cleanup", "🗑️", "Park or beach cleanup",
    "Grab gloves and trash bags and leave a favorite spot better than you found it. Ice cream after.",
    { cost: 0, mins: 90, setting: "outdoor", times: "morning afternoon", travel: 1, adventure: .2, active: .5, crowd: .3,
      interests: "outdoorsy", love: "acts" });
  idea("plant-garden", "🌱", "Plant a mini herb garden",
    "Pick up a few pots and seedlings. Each of you is in charge of keeping one plant alive.",
    { cost: 1, mins: 90, setting: "either", times: "morning afternoon", travel: 0, adventure: .2, active: .3, crowd: 0,
      interests: "outdoorsy", love: "acts gifts", months: "3 4 5 6 7 8 9" });
  idea("zoo", "🦒", "Zoo day",
    "Map out the animals you each want to see most. Narrate them like a nature documentary.",
    { cost: 2, mins: 240, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .3, active: .5, crowd: .8,
      interests: "nerdy outdoorsy", love: "quality" });

  // ---------- Snow and seasons ----------
  idea("sledding", "🛷", "Sledding and hot cocoa",
    "Find the best hill in {city}, race a few runs, then thaw out with cocoa.",
    { cost: 0, mins: 120, setting: "outdoor", times: "morning afternoon", travel: 1, adventure: .6, active: .7, crowd: .5,
      interests: "outdoorsy sporty", love: "quality touch", near: "snow", months: "12 1 2", bestWhen: "snow" });
  idea("snowman-build-off", "⛄", "Snowman build-off",
    "Fifteen minutes each, then judge whose snowman has the most personality.",
    { cost: 0, mins: 60, setting: "outdoor", times: "morning afternoon", travel: 0, adventure: .3, active: .5, crowd: 0,
      interests: "artsy outdoorsy gamer", love: "quality", near: "snow", months: "12 1 2", bestWhen: "snow" });
  idea("ski-day", "🎿", "Ski or snowboard day",
    "Rent gear, take a lesson if you're new, and spend the day on the slopes.",
    { cost: 3, mins: 480, setting: "outdoor", times: "morning afternoon", travel: 3, adventure: .9, active: .9, crowd: .5,
      interests: "sporty outdoorsy", love: "quality", near: "snow", months: "12 1 2 3" });
  idea("snowshoe", "🥾", "Snowshoe trail",
    "Rent snowshoes and crunch through a quiet trail. Pack a thermos.",
    { cost: 1, mins: 150, setting: "outdoor", times: "morning afternoon", travel: 2, adventure: .6, active: .8, crowd: .1,
      interests: "outdoorsy sporty", love: "quality", near: "snow", months: "12 1 2" });
  idea("ice-skating", "⛸️", "Ice skating",
    "Hold hands so nobody falls. (Somebody will fall.)",
    { cost: 1, mins: 90, setting: "either", times: "afternoon evening", travel: 2, adventure: .5, active: .7, crowd: .7,
      interests: "sporty", love: "touch quality", months: "11 12 1 2" });
  idea("holiday-lights", "🎄", "Holiday lights drive",
    "Find the neighborhood with the most over-the-top lights, play holiday music, and rank the houses.",
    { cost: 0, mins: 90, setting: "either", times: "evening night", travel: 2, adventure: .2, active: .1, crowd: .4,
      interests: "musical", love: "touch quality", months: "12" });
  idea("cocoa-movie", "☕", "Hot cocoa bar and a holiday movie",
    "Set out toppings (marshmallows, peppermint, whipped cream) and watch a cheesy holiday movie.",
    { cost: 1, mins: 150, setting: "indoor", times: "evening", travel: 0, adventure: .1, active: 0, crowd: 0, food: .5,
      love: "touch quality", months: "11 12 1", foods: "dairy sweets", bestWhen: "snow" });
  idea("gingerbread", "🏠", "Gingerbread house build-off",
    "Get a kit each and a timer. Bonus points for the most structurally questionable design.",
    { cost: 1, mins: 120, setting: "indoor", times: "afternoon evening", travel: 0, adventure: .3, active: .2, crowd: 0, food: .4,
      interests: "artsy gamer", love: "quality", months: "11 12", foods: "gluten sweets" });
  idea("cookie-decorating", "🍪", "Holiday cookie decorating",
    "Bake (or buy) plain sugar cookies and decorate them for each other.",
    { cost: 1, mins: 120, setting: "indoor", times: "afternoon evening", travel: 0, adventure: .2, active: .1, crowd: 0, food: .6,
      interests: "artsy", love: "gifts quality", months: "12", foods: "gluten sweets" });
  idea("ugly-sweater-thrift", "🧶", "Ugly sweater thrift challenge",
    "$10 each to find the other person the ugliest sweater in the store. They have to wear it.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon", travel: 1, adventure: .5, active: .3, crowd: .5,
      interests: "gamer artsy", love: "gifts", months: "11 12" });
  idea("homemade-valentines", "💝", "Make homemade valentines",
    "Construction paper, glitter, terrible puns. Swap them at the end.",
    { cost: 0, mins: 60, setting: "indoor", times: "any", travel: 0, adventure: .1, active: .1, crowd: 0,
      interests: "artsy", love: "words gifts", months: "2" });
  idea("fireworks", "🎆", "Watch fireworks",
    "July 4th or New Year's Eve: find a spot early, bring a blanket, and claim your view.",
    { cost: 0, mins: 120, setting: "outdoor", times: "night", travel: 2, adventure: .4, active: .2, crowd: .9,
      love: "touch quality", months: "7 12" });
  idea("apple-picking", "🍎", "Apple picking",
    "Pick a bag at an orchard, then go home and make something with them.",
    { cost: 1, mins: 180, setting: "outdoor", times: "morning afternoon", travel: 3, adventure: .4, active: .5, crowd: .5, food: .4,
      interests: "outdoorsy", love: "quality", near: "farms", months: "9 10" });
  idea("pumpkin-patch", "🎃", "Pumpkin patch and carving",
    "Each pick the other's pumpkin, then carve them at home. No showing until they're done.",
    { cost: 1, mins: 180, setting: "outdoor", times: "afternoon", travel: 2, adventure: .3, active: .4, crowd: .6,
      interests: "artsy", love: "quality gifts", months: "9 10" });
  idea("corn-maze", "🌽", "Corn maze",
    "Split up at the entrance and race to the middle, or stick together and get lost.",
    { cost: 1, mins: 120, setting: "outdoor", times: "afternoon evening", travel: 3, adventure: .6, active: .5, crowd: .6,
      interests: "gamer outdoorsy", love: "quality", near: "farms", months: "9 10" });
  idea("berry-picking", "🍓", "Berry picking",
    "Pick strawberries or blueberries at a farm. Eat about half of them on the spot.",
    { cost: 1, mins: 150, setting: "outdoor", times: "morning", travel: 3, adventure: .3, active: .4, crowd: .4, food: .5,
      interests: "outdoorsy", love: "quality", near: "farms", months: "6 7" });
  idea("sunflower-field", "🌻", "Sunflower field photos",
    "Find a farm with a sunflower field and take the cheesiest photos you can.",
    { cost: 1, mins: 120, setting: "outdoor", times: "morning evening", travel: 3, adventure: .3, active: .3, crowd: .5,
      interests: "artsy outdoorsy", love: "quality", near: "farms", months: "7 8 9" });
  idea("haunted-house", "👻", "Haunted house or ghost tour",
    "Pick the scariest one you can handle. Holding hands is mandatory.",
    { cost: 2, mins: 120, setting: "either", times: "evening night", travel: 2, adventure: .8, active: .4, crowd: .7,
      love: "touch quality", months: "10" });
  idea("scary-movie-marathon", "🧟", "Scary movie marathon",
    "Three horror movies, one blanket, all the lights off.",
    { cost: 0, mins: 300, setting: "indoor", times: "evening night", travel: 0, adventure: .6, active: 0, crowd: 0,
      love: "touch quality", months: "10", bestWhen: "rain" });
  idea("couples-costume", "🦸", "DIY couples costume",
    "Pick a duo and build the costume together out of whatever you can find or thrift.",
    { cost: 1, mins: 150, setting: "indoor", times: "afternoon evening", travel: 1, adventure: .5, active: .2, crowd: .2,
      interests: "artsy", love: "quality", months: "10" });
  idea("drive-in", "🚘", "Drive-in movie",
    "Fill the back seat with pillows and snacks, and tune the radio to the movie.",
    { cost: 2, mins: 180, setting: "outdoor", times: "night", travel: 3, adventure: .3, active: 0, crowd: .4, food: .3,
      interests: "artsy", love: "touch quality", months: "5 6 7 8 9" });
  idea("outdoor-movie", "🎬", "Movie in the park",
    "Lots of towns show free movies outside in summer. Bring a blanket and popcorn.",
    { cost: 0, mins: 150, setting: "outdoor", times: "evening night", travel: 1, adventure: .2, active: 0, crowd: .7,
      love: "touch quality", months: "6 7 8" });
  idea("county-fair", "🎡", "Carnival or county fair",
    "Ride the Ferris wheel at sunset, eat something fried, and win (or try to win) a stuffed animal.",
    { cost: 2, mins: 240, setting: "outdoor", times: "afternoon evening", travel: 2, adventure: .6, active: .4, crowd: .9, food: .5,
      interests: "gamer", love: "gifts touch", months: "6 7 8 9" });
  idea("pool-day", "🏊", "Public pool day",
    "Cannonball contest, chicken fights, and a long float. Pack snacks for after.",
    { cost: 0, mins: 180, setting: "outdoor", times: "afternoon", travel: 1, adventure: .3, active: .6, crowd: .7,
      interests: "sporty", love: "quality", months: "6 7 8", bestWhen: "hot" });
  idea("water-park", "💦", "Water park",
    "Ride every slide at least once, especially the one that looks too scary.",
    { cost: 3, mins: 360, setting: "outdoor", times: "morning afternoon", travel: 3, adventure: .8, active: .8, crowd: 1,
      interests: "sporty", love: "quality", months: "6 7 8", bestWhen: "hot" });
  idea("amusement-park", "🎢", "Amusement park",
    "Front row on the biggest coaster. Then something gentle so you can hold hands.",
    { cost: 3, mins: 480, setting: "outdoor", times: "morning afternoon", travel: 3, adventure: .9, active: .6, crowd: 1, food: .3,
      love: "quality touch", months: "4 5 6 7 8 9 10" });

  // ---------- Food ----------
  idea("taco-crawl", "🌮", "Taco crawl",
    "Three taco spots, one taco each, rated on a napkin scorecard.",
    { cost: 2, mins: 180, setting: "either", times: "afternoon evening", travel: 2, adventure: .5, active: .3, crowd: .6, food: 1,
      love: "quality", foods: "spicy meat" });
  idea("cook-new-recipe", "🍝", "Cook a new recipe together",
    "Pick a dish neither of you has made before, split the chopping, and eat it by candlelight.",
    { cost: 1, mins: 120, setting: "indoor", times: "evening", travel: 0, adventure: .4, active: .3, crowd: 0, food: .9,
      love: "acts quality" });
  idea("bake-off", "🧁", "Blind bake-off",
    "Each bake something in secret, then judge them without knowing whose is whose.",
    { cost: 1, mins: 150, setting: "indoor", times: "afternoon evening", travel: 0, adventure: .4, active: .3, crowd: 0, food: .8,
      interests: "artsy gamer", love: "acts", foods: "gluten sweets" });
  idea("homemade-pizza", "🍕", "Homemade pizza night",
    "Make the dough, then each top half the pizza with something the other has to try.",
    { cost: 1, mins: 120, setting: "indoor", times: "evening", travel: 0, adventure: .3, active: .2, crowd: 0, food: .9,
      love: "quality acts", foods: "gluten dairy" });
  idea("dumpling-night", "🥟", "Dumpling folding night",
    "Buy wrappers and fillings, watch one tutorial, and see whose folds look least like a disaster.",
    { cost: 1, mins: 120, setting: "indoor", times: "evening", travel: 0, adventure: .4, active: .2, crowd: 0, food: .9,
      interests: "artsy", love: "quality", foods: "gluten" });
  idea("sushi-making", "🍣", "Sushi rolling at home",
    "Pick up a bamboo mat and nori. Veggie rolls count too.",
    { cost: 2, mins: 120, setting: "indoor", times: "evening", travel: 0, adventure: .5, active: .2, crowd: 0, food: .9,
      love: "quality", foods: "seafood" });
  idea("cooking-class", "👩‍🍳", "Take a cooking class",
    "Learn something you'd never try alone, like fresh pasta, curry, or macarons.",
    { cost: 3, mins: 150, setting: "indoor", times: "evening", travel: 2, adventure: .5, active: .3, crowd: .5, food: 1,
      love: "quality" });
  idea("food-trucks", "🚚", "Food truck hunt",
    "Find where the food trucks gather and split something from three different ones.",
    { cost: 1, mins: 90, setting: "outdoor", times: "afternoon evening", travel: 1, adventure: .5, active: .3, crowd: .6, food: .9,
      love: "quality" });
  idea("ice-cream-flight", "🍦", "Ice cream flight",
    "Each pick three flavors you'd never normally order and share them all.",
    { cost: 1, mins: 60, setting: "either", times: "afternoon evening", travel: 1, adventure: .3, active: .1, crowd: .5, food: .7,
      love: "quality", foods: "dairy sweets", bestWhen: "hot" });
  idea("breakfast-for-dinner", "🥞", "Breakfast for dinner",
    "Pancakes, eggs, and pajamas at 8pm. Bonus: pancake art.",
    { cost: 1, mins: 90, setting: "indoor", times: "evening", travel: 0, adventure: .1, active: .1, crowd: 0, food: .7,
      love: "acts quality", foods: "gluten" });
  idea("mystery-picnic", "🧃", "Mystery picnic",
    "Each pack half the picnic in secret and reveal it at the spot.",
    { cost: 1, mins: 120, setting: "outdoor", times: "afternoon", travel: 1, adventure: .4, active: .2, crowd: .3, food: .6,
      interests: "outdoorsy", love: "gifts acts" });
  idea("new-cuisine", "🍜", "Try a cuisine neither of you has had",
    "Ethiopian, Peruvian, Korean, Georgian — pick something brand new and order the chef's favorites.",
    { cost: 2, mins: 90, setting: "indoor", times: "evening", travel: 2, adventure: .7, active: .1, crowd: .5, food: 1,
      love: "quality" });
  idea("dress-up-dinner", "🍽️", "Dress-up dinner",
    "Make a reservation somewhere nice, dress up more than you need to, and order dessert.",
    { cost: 3, mins: 120, setting: "indoor", times: "evening", travel: 2, adventure: .2, active: .1, crowd: .5, food: .9,
      love: "quality" });
  idea("hole-in-the-wall", "🥡", "Hole-in-the-wall hunt",
    "Find the best-rated tiny restaurant with almost no reviews and give it a try.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .6, active: .1, crowd: .3, food: .9,
      love: "quality" });
  idea("coffee-crawl", "☕", "Coffee shop crawl",
    "Three cafés, one drink each, ranked on the way home.",
    { cost: 1, mins: 150, setting: "indoor", times: "morning afternoon", travel: 1, adventure: .3, active: .3, crowd: .5, food: .5,
      love: "quality", foods: "coffee", bestWhen: "rain" });
  idea("bubble-tea-walk", "🧋", "Bubble tea and a walk",
    "Try a flavor you'd never pick, then walk until the drinks run out.",
    { cost: 1, mins: 60, setting: "either", times: "afternoon evening", travel: 1, adventure: .2, active: .3, crowd: .5, food: .4,
      love: "quality" });
  idea("dessert-first", "🍰", "Dessert-first date",
    "Dessert at one place, then dinner at another. Rules are made up anyway.",
    { cost: 2, mins: 150, setting: "indoor", times: "evening", travel: 2, adventure: .4, active: .2, crowd: .5, food: .9,
      love: "quality", foods: "sweets" });
  idea("ten-dollar-grocery", "🛒", "$10 grocery challenge",
    "Each get $10 to buy ingredients for a dish the other person cooks. Be nice. Or don't.",
    { cost: 1, mins: 120, setting: "indoor", times: "evening", travel: 1, adventure: .6, active: .3, crowd: .3, food: .8,
      interests: "gamer", love: "gifts acts" });
  idea("backyard-cookout", "🍔", "Backyard cookout",
    "Fire up a grill, make burgers or veggie skewers, and eat outside.",
    { cost: 1, mins: 150, setting: "outdoor", times: "afternoon evening", travel: 0, adventure: .1, active: .2, crowd: .2, food: .8,
      interests: "outdoorsy", love: "acts quality", foods: "meat", months: "5 6 7 8 9" });
  idea("smoothie-bar", "🥤", "Smoothie bar morning",
    "Lay out fruit and mix-ins and make each other a custom smoothie.",
    { cost: 1, mins: 45, setting: "indoor", times: "morning", travel: 0, adventure: .2, active: .2, crowd: 0, food: .6,
      love: "acts" });
  idea("chopped-at-home", "🧑‍🍳", "\"Chopped\" at home",
    "Pick four mystery ingredients for each other and set a 30-minute timer.",
    { cost: 1, mins: 90, setting: "indoor", times: "evening", travel: 0, adventure: .6, active: .3, crowd: 0, food: .9,
      interests: "gamer", love: "acts quality" });
  idea("fondue-night", "🫕", "Fondue night",
    "Cheese for dinner, chocolate for dessert, and lots of things to dip.",
    { cost: 2, mins: 120, setting: "indoor", times: "evening", travel: 0, adventure: .2, active: 0, crowd: 0, food: .9,
      love: "touch quality", foods: "dairy" });
  idea("tea-party", "🫖", "Fancy tea party",
    "Pull out the nicest cups you have, make tiny sandwiches, and use your poshest accents.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon", travel: 0, adventure: .1, active: 0, crowd: 0, food: .5,
      interests: "artsy", love: "quality acts" });
  idea("snack-taste-test", "🌍", "International snack taste test",
    "Hit an international grocery store, grab six snacks you've never seen, and rank them.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon evening", travel: 1, adventure: .6, active: .2, crowd: .3, food: .7,
      interests: "gamer nerdy", love: "quality" });
  idea("hot-sauce-challenge", "🌶️", "Hot sauce challenge",
    "Line up five sauces from mild to wild. Milk on standby.",
    { cost: 1, mins: 45, setting: "indoor", times: "evening", travel: 0, adventure: .8, active: .1, crowd: 0, food: .7,
      interests: "gamer", love: "quality", foods: "spicy" });
  idea("bakery-tour", "🥐", "Bakery tour",
    "Visit two or three bakeries in the morning and split one pastry at each.",
    { cost: 1, mins: 120, setting: "indoor", times: "morning", travel: 1, adventure: .3, active: .3, crowd: .4, food: .9,
      love: "quality", foods: "gluten sweets" });
  idea("late-night-diner", "🍟", "Late-night diner run",
    "Fries, milkshakes, and a booth at 10pm. Talk until they kick you out.",
    { cost: 1, mins: 90, setting: "indoor", times: "night", travel: 1, adventure: .3, active: 0, crowd: .4, food: .6,
      love: "quality words", foods: "dairy" });
  idea("upgrade-ramen", "🍜", "Upgrade instant ramen",
    "Raid the fridge for toppings — eggs, scallions, cheese — and compete for the best bowl.",
    { cost: 0, mins: 45, setting: "indoor", times: "evening night", travel: 0, adventure: .3, active: 0, crowd: 0, food: .6,
      interests: "gamer", love: "quality", foods: "gluten", bestWhen: "rain" });
  idea("cook-their-favorite", "🍲", "Cook their favorite meal",
    "Find out what they loved eating as a kid and make it from scratch.",
    { cost: 1, mins: 120, setting: "indoor", times: "evening", travel: 0, adventure: .2, active: .2, crowd: 0, food: .8,
      love: "acts gifts" });
  idea("breakfast-dropoff", "🥯", "Surprise breakfast drop-off",
    "Show up at their door with their favorite breakfast and coffee order before school or work.",
    { cost: 1, mins: 30, setting: "either", times: "morning", travel: 1, adventure: .3, active: .1, crowd: 0, food: .5,
      love: "acts gifts" });
  idea("night-market", "🏮", "Night market or street fair",
    "Walk every stall, then share three snacks you've never tried.",
    { cost: 1, mins: 150, setting: "outdoor", times: "evening night", travel: 2, adventure: .5, active: .4, crowd: .9, food: .7,
      love: "quality", near: "downtown", months: "5 6 7 8 9 10" });

  // ---------- At home and low-key ----------
  idea("blanket-fort-movies", "🎬", "Blanket fort movie marathon",
    "Build the fort first, then pick a trilogy and see how far you get.",
    { cost: 0, mins: 300, setting: "indoor", times: "evening night", travel: 0, adventure: .1, active: 0, crowd: 0,
      love: "touch quality", bestWhen: "rain" });
  idea("puzzle-night", "🧩", "Puzzle night",
    "A 1,000-piece puzzle, snacks, and a playlist. Edges first.",
    { cost: 1, mins: 180, setting: "indoor", times: "evening", travel: 0, adventure: .1, active: 0, crowd: 0,
      interests: "nerdy", love: "quality", bestWhen: "rain" });
  idea("board-game-night", "🎲", "Board game night",
    "Pull out a two-player game, or learn a new one together. Loser does the dishes.",
    { cost: 0, mins: 120, setting: "indoor", times: "evening night", travel: 0, adventure: .3, active: .1, crowd: 0,
      interests: "gamer nerdy", love: "quality", bestWhen: "rain" });
  idea("co-op-video-games", "🎮", "Co-op video game night",
    "Pick a game you have to beat together. Teamwork only.",
    { cost: 0, mins: 150, setting: "indoor", times: "evening night", travel: 0, adventure: .4, active: .1, crowd: 0,
      interests: "gamer", love: "quality", bestWhen: "rain" });
  idea("write-letters", "💌", "Write each other letters",
    "Fifteen minutes, one candle, two letters. Read them at the same time.",
    { cost: 0, mins: 45, setting: "indoor", times: "evening", travel: 0, adventure: .2, active: 0, crowd: 0,
      interests: "artsy", love: "words" });
  idea("time-capsule", "⏳", "Make a time capsule",
    "Fill a jar with notes, photos, and predictions. Open it in a year.",
    { cost: 0, mins: 90, setting: "indoor", times: "any", travel: 0, adventure: .3, active: .1, crowd: 0,
      interests: "artsy", love: "words gifts" });
  idea("portrait-swap", "🎨", "Paint each other's portraits",
    "Twenty minutes, no peeking. The worse they look, the better.",
    { cost: 1, mins: 60, setting: "indoor", times: "afternoon evening", travel: 0, adventure: .4, active: .1, crowd: 0,
      interests: "artsy", love: "quality gifts" });
  idea("diy-terrarium", "🪴", "Build terrariums",
    "Grab jars, soil, and tiny plants, and make one for each other.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon", travel: 1, adventure: .2, active: .1, crowd: 0,
      interests: "artsy outdoorsy", love: "gifts" });
  idea("spa-night", "🧖", "At-home spa night",
    "Face masks, a chill playlist, and hand or shoulder rubs.",
    { cost: 1, mins: 90, setting: "indoor", times: "evening", travel: 0, adventure: .1, active: 0, crowd: 0,
      love: "touch acts" });
  idea("living-room-karaoke", "🎤", "Living room karaoke",
    "Pull up karaoke videos on the TV and commit to every song.",
    { cost: 0, mins: 90, setting: "indoor", times: "evening night", travel: 0, adventure: .6, active: .4, crowd: 0,
      interests: "musical gamer", love: "quality" });
  idea("kitchen-slow-dance", "💃", "Slow dance in the kitchen",
    "Take turns picking songs. No one is watching.",
    { cost: 0, mins: 30, setting: "indoor", times: "evening night", travel: 0, adventure: .4, active: .3, crowd: 0,
      interests: "musical", love: "touch" });
  idea("learn-a-dance", "🕺", "Learn a dance from a video",
    "Pick a trending dance or a classic routine and practice until you can do it together.",
    { cost: 0, mins: 60, setting: "indoor", times: "any", travel: 0, adventure: .6, active: .7, crowd: 0,
      interests: "musical sporty", love: "quality touch" });
  idea("36-questions", "❓", "The 36 questions",
    "Look up the famous \"36 questions\" that bring people closer and take turns answering.",
    { cost: 0, mins: 90, setting: "either", times: "evening night", travel: 0, adventure: .4, active: 0, crowd: 0,
      love: "words quality" });
  idea("trivia-about-us", "🧠", "Make a trivia game about each other",
    "Write ten questions about yourself and see who knows the other better.",
    { cost: 0, mins: 60, setting: "indoor", times: "any", travel: 0, adventure: .3, active: 0, crowd: 0,
      interests: "gamer nerdy", love: "words quality" });
  idea("build-lego", "🧱", "Build a LEGO set together",
    "Pick a set you both like and split the steps. Snacks between bags.",
    { cost: 2, mins: 180, setting: "indoor", times: "afternoon evening", travel: 0, adventure: .2, active: .1, crowd: 0,
      interests: "nerdy", love: "quality gifts", bestWhen: "rain" });
  idea("playlist-swap", "🎧", "Playlist swap",
    "Each make a playlist that explains you. Listen together and tell the story behind each song.",
    { cost: 0, mins: 60, setting: "indoor", times: "any", travel: 0, adventure: .2, active: 0, crowd: 0,
      interests: "musical", love: "words gifts" });
  idea("themed-movie-night", "🍿", "Themed movie night",
    "Pick a movie and make food from where it's set — pasta for anything in Italy, ramen for anime.",
    { cost: 1, mins: 180, setting: "indoor", times: "evening", travel: 0, adventure: .3, active: .1, crowd: 0, food: .5,
      interests: "artsy", love: "quality acts" });
  idea("documentary-debate", "📺", "Documentary and debate",
    "Watch a documentary and argue about it over snacks.",
    { cost: 0, mins: 120, setting: "indoor", times: "evening", travel: 0, adventure: .2, active: 0, crowd: 0,
      interests: "nerdy", love: "quality words" });
  idea("book-club-for-two", "📖", "Book club for two",
    "Pick a short book, read it over a week, and meet at a café to talk about it.",
    { cost: 1, mins: 90, setting: "indoor", times: "any", travel: 1, adventure: .2, active: 0, crowd: .2,
      interests: "nerdy artsy", love: "words quality" });
  idea("living-room-olympics", "🏅", "Living room Olympics",
    "Make up five silly events, make medals out of foil, and play the anthem for the winner.",
    { cost: 0, mins: 90, setting: "indoor", times: "afternoon evening", travel: 0, adventure: .6, active: .7, crowd: 0,
      interests: "gamer sporty", love: "quality" });
  idea("tie-dye", "👕", "Tie-dye matching shirts",
    "Grab a kit and two white shirts. Wear them on your next date.",
    { cost: 1, mins: 90, setting: "outdoor", times: "afternoon", travel: 0, adventure: .3, active: .2, crowd: 0,
      interests: "artsy", love: "gifts quality", months: "4 5 6 7 8 9" });
  idea("matching-bracelets", "📿", "Make matching bracelets",
    "Beads, string, and one secret word spelled out on each.",
    { cost: 1, mins: 60, setting: "indoor", times: "any", travel: 0, adventure: .1, active: 0, crowd: 0,
      interests: "artsy", love: "gifts words" });
  idea("mini-scrapbook", "📒", "Mini scrapbook of your dates",
    "Print photos, save ticket stubs, and add captions only the two of you would get.",
    { cost: 1, mins: 90, setting: "indoor", times: "any", travel: 0, adventure: .1, active: 0, crowd: 0,
      interests: "artsy", love: "words gifts" });
  idea("bucket-list", "📝", "Write a bucket list together",
    "Twenty things to do together. Pick one to do this month.",
    { cost: 0, mins: 45, setting: "either", times: "any", travel: 0, adventure: .5, active: 0, crowd: 0,
      love: "words quality" });
  idea("learn-a-language", "🗣️", "Learn 20 words in a new language",
    "Pick a language, quiz each other, and use it for the rest of the night.",
    { cost: 0, mins: 60, setting: "indoor", times: "any", travel: 0, adventure: .4, active: 0, crowd: 0,
      interests: "nerdy", love: "quality words" });
  idea("origami", "🦢", "Origami night",
    "Follow a tutorial and fold each other a tiny paper zoo.",
    { cost: 0, mins: 60, setting: "indoor", times: "evening", travel: 0, adventure: .1, active: 0, crowd: 0,
      interests: "artsy nerdy", love: "gifts" });
  idea("clay-night", "🏺", "Air-dry clay night",
    "Make each other a tiny sculpture, a ring dish, or a very lumpy mug.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon evening", travel: 0, adventure: .2, active: .1, crowd: 0,
      interests: "artsy", love: "gifts" });
  idea("candle-making", "🕯️", "Make candles",
    "Melt wax, add scents, and name each candle after an inside joke.",
    { cost: 1, mins: 90, setting: "indoor", times: "evening", travel: 0, adventure: .2, active: .1, crowd: 0,
      interests: "artsy", love: "gifts" });
  idea("reasons-jar", "🫙", "\"Reasons I like you\" jar",
    "Write 20 small notes, fold them up, and swap jars.",
    { cost: 0, mins: 45, setting: "indoor", times: "any", travel: 0, adventure: .1, active: 0, crowd: 0,
      interests: "artsy", love: "words gifts" });
  idea("hidden-notes", "💌", "Hide notes for each other",
    "Hide five small notes where the other will find them over the week.",
    { cost: 0, mins: 30, setting: "indoor", times: "any", travel: 0, adventure: .2, active: 0, crowd: 0,
      love: "words" });
  idea("fix-it-day", "🔧", "Fix-it day",
    "Tackle something on each other's to-do list — a bike tire, a messy closet, a résumé.",
    { cost: 0, mins: 120, setting: "either", times: "morning afternoon", travel: 0, adventure: .2, active: .5, crowd: 0,
      love: "acts" });
  idea("retro-game-tourney", "🕹️", "Retro game tournament",
    "Dig out old consoles or play free classics in a browser. Best of five.",
    { cost: 0, mins: 120, setting: "indoor", times: "evening night", travel: 0, adventure: .3, active: .1, crowd: 0,
      interests: "gamer nerdy", love: "quality", bestWhen: "rain" });
  idea("dnd-one-shot", "🐉", "Tabletop adventure for two",
    "Find a free one-shot adventure online. One plays the hero, one tells the story.",
    { cost: 0, mins: 150, setting: "indoor", times: "evening night", travel: 0, adventure: .6, active: 0, crowd: 0,
      interests: "nerdy gamer", love: "quality words" });
  idea("stargazing-app-roof", "🔭", "Backyard astronomy",
    "Lie on the grass with a star app and find three constellations before you go inside.",
    { cost: 0, mins: 60, setting: "outdoor", times: "night", travel: 0, adventure: .2, active: 0, crowd: 0,
      interests: "nerdy outdoorsy", love: "touch quality" });
  idea("song-together", "🎹", "Write a song together",
    "One does lyrics, one does the tune. It can be about the dog.",
    { cost: 0, mins: 90, setting: "indoor", times: "any", travel: 0, adventure: .6, active: .1, crowd: 0,
      interests: "musical artsy", love: "words quality" });
  idea("surprise-date", "🎁", "Plan a surprise date for each other",
    "Each plan half the day. The other just shows up.",
    { cost: 1, mins: 240, setting: "either", times: "afternoon evening", travel: 2, adventure: .7, active: .4, crowd: .4,
      love: "gifts acts" });
  idea("five-dollar-gift", "🎁", "$5 gift challenge",
    "Dollar store or thrift shop: $5 each to find the other the perfect gift.",
    { cost: 1, mins: 60, setting: "indoor", times: "afternoon", travel: 1, adventure: .4, active: .3, crowd: .5,
      interests: "gamer", love: "gifts" });
  idea("gratitude-walk", "🙏", "Gratitude walk",
    "Walk a loop and take turns saying one thing you like about each other every block.",
    { cost: 0, mins: 45, setting: "outdoor", times: "any", travel: 1, adventure: .1, active: .4, crowd: .2,
      love: "words quality" });
  idea("volunteer", "🤝", "Volunteer together",
    "Sign up for a shift at a food bank, library, or community garden.",
    { cost: 0, mins: 180, setting: "either", times: "morning afternoon", travel: 2, adventure: .3, active: .6, crowd: .5,
      love: "acts" });
  idea("animal-shelter", "🐶", "Walk shelter dogs",
    "Lots of shelters let volunteers take dogs out for a walk. Pick the saddest-looking one.",
    { cost: 0, mins: 120, setting: "outdoor", times: "morning afternoon", travel: 1, adventure: .3, active: .5, crowd: .2,
      interests: "outdoorsy", love: "acts touch" });

  // ---------- Arts and culture ----------
  idea("museum", "🏛️", "Museum date",
    "Each pick the one thing you'd steal. Explain your reasons over coffee after.",
    { cost: 1, mins: 150, setting: "indoor", times: "morning afternoon", travel: 2, adventure: .3, active: .3, crowd: .5,
      interests: "artsy nerdy", love: "quality", bestWhen: "rain" });
  idea("gallery-walk", "🖼️", "Art gallery walk",
    "Many downtowns have free gallery nights once a month. Pick your favorite piece in each.",
    { cost: 0, mins: 120, setting: "indoor", times: "evening", travel: 2, adventure: .3, active: .3, crowd: .6,
      interests: "artsy", love: "quality", near: "downtown" });
  idea("pottery-class", "🏺", "Pottery wheel class",
    "Very messy, very fun. Make something for each other.",
    { cost: 3, mins: 150, setting: "indoor", times: "evening", travel: 2, adventure: .5, active: .3, crowd: .4,
      interests: "artsy", love: "gifts touch" });
  idea("paint-your-own", "🎨", "Paint-your-own pottery",
    "Pick a mug or plate, paint it for each other, and pick them up next week.",
    { cost: 2, mins: 120, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .2, active: .1, crowd: .4,
      interests: "artsy", love: "gifts quality" });
  idea("library-date", "📚", "Library book swap",
    "Ten minutes to find a book for each other. Read the first chapter side by side.",
    { cost: 0, mins: 90, setting: "indoor", times: "afternoon", travel: 1, adventure: .2, active: .1, crowd: .2,
      interests: "nerdy artsy", love: "gifts quality" });
  idea("used-bookstore", "📖", "Used bookstore hunt",
    "Find a book under $5 that reminds you of the other person. Write a note inside.",
    { cost: 1, mins: 60, setting: "indoor", times: "afternoon", travel: 1, adventure: .2, active: .2, crowd: .3,
      interests: "nerdy artsy", love: "gifts words" });
  idea("thrift-outfit", "👗", "Thrift store outfit challenge",
    "$15 each to dress the other head to toe. Wear the outfits to dinner.",
    { cost: 1, mins: 120, setting: "indoor", times: "afternoon", travel: 1, adventure: .6, active: .4, crowd: .5,
      interests: "artsy gamer", love: "gifts" });
  idea("local-theater", "🎭", "See a local play or musical",
    "Community and school theater tickets are cheap and the shows are surprisingly good.",
    { cost: 2, mins: 150, setting: "indoor", times: "evening", travel: 2, adventure: .3, active: 0, crowd: .7,
      interests: "artsy musical", love: "quality" });
  idea("improv-show", "😂", "Improv show",
    "Lots of improv theaters have cheap all-ages shows. Sit up front if you're brave.",
    { cost: 1, mins: 90, setting: "indoor", times: "evening night", travel: 2, adventure: .5, active: 0, crowd: .7,
      interests: "artsy", love: "quality" });
  idea("comedy-club", "🎙️", "Comedy club",
    "Stand-up night at a comedy club. Many are 18 and up, so check first.",
    { cost: 2, mins: 120, setting: "indoor", times: "night", travel: 2, adventure: .5, active: 0, crowd: .8,
      love: "quality", near: "downtown", minAge: 18 });
  idea("street-art-hunt", "🖌️", "Street art hunt",
    "Find murals around {city} and recreate the poses in photos.",
    { cost: 0, mins: 120, setting: "outdoor", times: "afternoon", travel: 2, adventure: .4, active: .5, crowd: .5,
      interests: "artsy", love: "quality", near: "downtown" });
  idea("planetarium", "🪐", "Planetarium show",
    "Lean back, look up, and pretend you're in space.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .3, active: 0, crowd: .4,
      interests: "nerdy", love: "touch quality", bestWhen: "rain" });
  idea("science-museum", "🔬", "Science museum",
    "Push every button and try every hands-on exhibit, like kids on a field trip.",
    { cost: 2, mins: 180, setting: "indoor", times: "morning afternoon", travel: 2, adventure: .4, active: .4, crowd: .7,
      interests: "nerdy", love: "quality", bestWhen: "rain" });
  idea("tourists-at-home", "🗺️", "Be tourists in {city}",
    "Do the touristy things locals never do. Get the cheesy photo and the souvenir.",
    { cost: 1, mins: 240, setting: "either", times: "morning afternoon", travel: 2, adventure: .5, active: .5, crowd: .7,
      interests: "nerdy", love: "quality gifts", near: "downtown" });
  idea("open-mic", "📜", "Open mic night",
    "Watch the poets and musicians, and maybe sign up next time.",
    { cost: 0, mins: 120, setting: "indoor", times: "evening", travel: 2, adventure: .5, active: 0, crowd: .5,
      interests: "artsy musical", love: "words quality" });
  idea("classic-movie-theater", "🎞️", "Old movie theater",
    "Find an old theater showing a classic or indie film. Share the big popcorn.",
    { cost: 1, mins: 150, setting: "indoor", times: "evening night", travel: 2, adventure: .2, active: 0, crowd: .5,
      interests: "artsy", love: "touch quality", bestWhen: "rain" });
  idea("makers-market", "🧵", "Craft fair or makers market",
    "Wander the booths and pick something handmade for each other under $10.",
    { cost: 1, mins: 120, setting: "either", times: "morning afternoon", travel: 2, adventure: .2, active: .3, crowd: .7,
      interests: "artsy", love: "gifts" });
  idea("glassblowing", "🔮", "Glassblowing class",
    "Make your own glass ornament or paperweight with a pro guiding you.",
    { cost: 3, mins: 120, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .7, active: .4, crowd: .3,
      interests: "artsy", love: "gifts" });
  idea("photo-booth", "📷", "Photo booth hunt",
    "Find a real photo booth and take a strip. Keep one each.",
    { cost: 1, mins: 60, setting: "indoor", times: "any", travel: 2, adventure: .3, active: .2, crowd: .5,
      interests: "artsy", love: "gifts touch", near: "downtown" });
  idea("disposable-camera", "🎞️", "Disposable camera day",
    "One camera, 27 shots, a whole day. Get them developed together.",
    { cost: 1, mins: 240, setting: "either", times: "any", travel: 1, adventure: .4, active: .4, crowd: .4,
      interests: "artsy", love: "gifts quality" });

  // ---------- Music ----------
  idea("free-concert", "🎸", "Free outdoor concert",
    "Parks and downtowns host free summer shows. Bring a blanket and dance anyway.",
    { cost: 0, mins: 150, setting: "outdoor", times: "evening", travel: 2, adventure: .4, active: .4, crowd: .8,
      interests: "musical", love: "quality touch", months: "5 6 7 8 9" });
  idea("local-band", "🎶", "See a local band",
    "Find an all-ages show and get close to the stage.",
    { cost: 1, mins: 150, setting: "indoor", times: "night", travel: 2, adventure: .6, active: .6, crowd: .9,
      interests: "musical", love: "quality" });
  idea("record-store", "💿", "Record store dig",
    "Each pick an album for the other based only on the cover.",
    { cost: 1, mins: 60, setting: "indoor", times: "afternoon", travel: 2, adventure: .3, active: .2, crowd: .3,
      interests: "musical artsy", love: "gifts" });
  idea("karaoke-room", "🎤", "Private karaoke room",
    "Rent a room for an hour and pick songs for each other.",
    { cost: 2, mins: 90, setting: "indoor", times: "evening night", travel: 2, adventure: .7, active: .5, crowd: .3,
      interests: "musical gamer", love: "quality" });
  idea("orchestra", "🎻", "Orchestra night",
    "Student and rush tickets are cheap. Dress up a little.",
    { cost: 2, mins: 150, setting: "indoor", times: "evening", travel: 2, adventure: .2, active: 0, crowd: .7,
      interests: "musical artsy", love: "quality" });
  idea("silent-disco", "🎧", "Silent disco",
    "Everyone's dancing to a different channel. Switch to the same one.",
    { cost: 2, mins: 120, setting: "either", times: "night", travel: 2, adventure: .7, active: .8, crowd: .9,
      interests: "musical", love: "touch quality" });
  idea("dance-class", "💃", "Salsa or swing class",
    "Drop-in beginner classes are cheap and nobody knows what they're doing.",
    { cost: 2, mins: 90, setting: "indoor", times: "evening", travel: 2, adventure: .7, active: .8, crowd: .6,
      interests: "musical sporty", love: "touch quality" });
  idea("music-store-jam", "🥁", "Music store test drive",
    "Try every instrument you've always wanted to play. Form a two-person band.",
    { cost: 0, mins: 60, setting: "indoor", times: "afternoon", travel: 2, adventure: .4, active: .3, crowd: .3,
      interests: "musical", love: "quality" });

  // ---------- Active and sporty ----------
  idea("climbing-gym", "🧗", "Climbing gym",
    "Try a bouldering session. Spot each other and cheer on the hard routes.",
    { cost: 2, mins: 120, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .8, active: .9, crowd: .5,
      interests: "sporty", love: "quality touch" });
  idea("trampoline-park", "🤸", "Trampoline park",
    "Dodgeball, foam pits, and the most competitive flips you've ever tried.",
    { cost: 2, mins: 90, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .7, active: .9, crowd: .8,
      interests: "sporty", love: "quality" });
  idea("mini-golf", "⛳", "Mini golf",
    "Loser buys milkshakes. Trick shots are encouraged.",
    { cost: 1, mins: 90, setting: "outdoor", times: "afternoon evening", travel: 2, adventure: .3, active: .3, crowd: .6,
      interests: "gamer sporty", love: "quality" });
  idea("bowling", "🎳", "Bowling",
    "Rent the shoes, give yourselves ridiculous names on the screen, and use bumpers if you need to.",
    { cost: 2, mins: 90, setting: "indoor", times: "evening night", travel: 2, adventure: .3, active: .4, crowd: .7,
      interests: "gamer sporty", love: "quality", bestWhen: "rain" });
  idea("go-karts", "🏎️", "Go-karts",
    "Race three laps. Talk trash. Rematch.",
    { cost: 2, mins: 60, setting: "outdoor", times: "afternoon evening", travel: 2, adventure: .8, active: .5, crowd: .7,
      interests: "gamer sporty", love: "quality" });
  idea("roller-rink", "🛼", "Roller rink night",
    "Skate to throwback songs and hold on for the couples skate.",
    { cost: 1, mins: 120, setting: "indoor", times: "evening night", travel: 2, adventure: .6, active: .8, crowd: .8,
      interests: "musical sporty", love: "touch quality" });
  idea("batting-cages", "⚾", "Batting cages",
    "Start slow, work up to the fast pitches, and see who can hit the most.",
    { cost: 1, mins: 60, setting: "outdoor", times: "afternoon evening", travel: 2, adventure: .5, active: .8, crowd: .4,
      interests: "sporty", love: "quality" });
  idea("pickleball", "🏓", "Pickleball at the park",
    "Borrow paddles and play on the free public courts. Best of three.",
    { cost: 0, mins: 90, setting: "outdoor", times: "morning afternoon evening", travel: 1, adventure: .4, active: .8, crowd: .3,
      interests: "sporty gamer", love: "quality" });
  idea("hoops-horse", "🏀", "Shoot hoops: H-O-R-S-E",
    "Find an outdoor court and play H-O-R-S-E. Winner picks the next date.",
    { cost: 0, mins: 60, setting: "outdoor", times: "afternoon evening", travel: 1, adventure: .3, active: .8, crowd: .2,
      interests: "sporty gamer", love: "quality" });
  idea("park-yoga", "🧘", "Yoga in the park",
    "Follow a free video on a blanket in the park and end with a long rest.",
    { cost: 0, mins: 60, setting: "outdoor", times: "morning evening", travel: 1, adventure: .2, active: .6, crowd: .2,
      interests: "sporty outdoorsy", love: "quality touch" });
  idea("fun-run", "🏃", "Sign up for a fun run",
    "Color run, costume 5K, glow run — train together and cross the finish line holding hands.",
    { cost: 2, mins: 120, setting: "outdoor", times: "morning", travel: 2, adventure: .6, active: 1, crowd: .9,
      interests: "sporty", love: "quality" });
  idea("arcade", "👾", "Arcade",
    "Pool your tickets and trade them in for the silliest prize you can get.",
    { cost: 2, mins: 120, setting: "indoor", times: "evening night", travel: 2, adventure: .4, active: .4, crowd: .8,
      interests: "gamer", love: "gifts quality", bestWhen: "rain" });
  idea("escape-room", "🔐", "Escape room",
    "You have 60 minutes. Find out how well you work together under pressure.",
    { cost: 3, mins: 90, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .7, active: .3, crowd: .2,
      interests: "nerdy gamer", love: "quality" });
  idea("laser-tag", "🔫", "Laser tag",
    "Same team or rivals, your call. Victory dance required.",
    { cost: 2, mins: 60, setting: "indoor", times: "afternoon evening night", travel: 2, adventure: .7, active: .9, crowd: .8,
      interests: "gamer sporty", love: "quality" });
  idea("axe-throwing", "🪓", "Axe throwing",
    "A coach shows you how, then you compete for bullseyes.",
    { cost: 3, mins: 90, setting: "indoor", times: "evening night", travel: 2, adventure: .9, active: .6, crowd: .6,
      interests: "sporty gamer", love: "quality", minAge: 18 });
  idea("indoor-skydiving", "🪂", "Indoor skydiving",
    "Fly in a wind tunnel. Zero planes required.",
    { cost: 3, mins: 90, setting: "indoor", times: "afternoon", travel: 3, adventure: 1, active: .7, crowd: .4,
      interests: "sporty", love: "quality" });
  idea("sports-game", "🏟️", "Local sports game",
    "High school, college, or minor league. Cheap tickets, loud cheering, stadium snacks.",
    { cost: 1, mins: 180, setting: "outdoor", times: "afternoon evening", travel: 2, adventure: .4, active: .3, crowd: 1, food: .3,
      interests: "sporty", love: "quality" });
  idea("scooter-tour", "🛴", "Scooter or bike-share tour",
    "Rent scooters or bikes and zip around {city} with no plan.",
    { cost: 1, mins: 90, setting: "outdoor", times: "afternoon evening", travel: 1, adventure: .6, active: .6, crowd: .6,
      interests: "sporty", love: "quality", near: "downtown" });
  idea("model-rocket", "🚀", "Launch a model rocket",
    "Build a starter rocket kit together and launch it in a big open field.",
    { cost: 2, mins: 150, setting: "outdoor", times: "afternoon", travel: 1, adventure: .6, active: .3, crowd: .1,
      interests: "nerdy", love: "quality" });

  // ---------- Nerdy and gamer ----------
  idea("trivia-night", "🧠", "All-ages trivia night",
    "Lots of cafés and libraries host trivia. Pick a dumb team name.",
    { cost: 0, mins: 120, setting: "indoor", times: "evening", travel: 2, adventure: .4, active: .1, crowd: .6,
      interests: "nerdy gamer", love: "quality" });
  idea("board-game-cafe", "♟️", "Board game café",
    "Pay a few dollars to play from a wall of games. Ask the staff for a two-player pick.",
    { cost: 1, mins: 150, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .3, active: .1, crowd: .5,
      interests: "gamer nerdy", love: "quality", bestWhen: "rain" });
  idea("comic-shop", "🦸", "Comic shop swap",
    "Pick a comic or manga for each other, then read them over milkshakes.",
    { cost: 1, mins: 90, setting: "indoor", times: "afternoon", travel: 2, adventure: .2, active: .1, crowd: .3,
      interests: "nerdy artsy", love: "gifts" });
  idea("observatory", "🔭", "Public observatory night",
    "Many observatories and astronomy clubs host free telescope nights.",
    { cost: 0, mins: 120, setting: "outdoor", times: "night", travel: 3, adventure: .4, active: .1, crowd: .3,
      interests: "nerdy", love: "quality touch" });
  idea("plane-spotting", "✈️", "Plane spotting",
    "Find a spot near the airport, track flights on an app, and guess where they're headed.",
    { cost: 0, mins: 60, setting: "outdoor", times: "afternoon evening", travel: 2, adventure: .3, active: 0, crowd: .1,
      interests: "nerdy", love: "quality" });
  idea("vr-arcade", "🥽", "VR arcade",
    "Try a two-player VR game. Try not to punch a wall.",
    { cost: 3, mins: 60, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .7, active: .6, crowd: .4,
      interests: "gamer nerdy", love: "quality" });
  idea("aquarium", "🐠", "Aquarium",
    "Find the jellyfish room and stay a while. Name your favorite fish.",
    { cost: 2, mins: 150, setting: "indoor", times: "morning afternoon", travel: 2, adventure: .2, active: .3, crowd: .6,
      interests: "nerdy", love: "quality touch", bestWhen: "rain" });
  idea("cat-cafe", "🐱", "Cat café",
    "Coffee, cats, and trying to get the grumpy one to sit on your lap.",
    { cost: 2, mins: 60, setting: "indoor", times: "afternoon", travel: 2, adventure: .2, active: .1, crowd: .3,
      love: "quality touch" });
  idea("mall-scavenger", "🛍️", "Mall scavenger hunt",
    "Make a list (a hat under $5, a photo with a mannequin, a free sample) and race to finish.",
    { cost: 0, mins: 90, setting: "indoor", times: "afternoon", travel: 2, adventure: .5, active: .5, crowd: .8,
      interests: "gamer", love: "quality", bestWhen: "rain" });
  idea("dream-apartment", "🛋️", "Dream apartment tour",
    "Walk through a big furniture store and pick out everything for a pretend home together.",
    { cost: 0, mins: 90, setting: "indoor", times: "afternoon", travel: 2, adventure: .2, active: .3, crowd: .7,
      love: "quality", bestWhen: "rain" });

  // ---------- City and day trips ----------
  idea("new-neighborhood", "🗺️", "Explore a new neighborhood",
    "Pick a part of {city} neither of you knows and wander with no plan.",
    { cost: 1, mins: 180, setting: "outdoor", times: "afternoon", travel: 2, adventure: .6, active: .5, crowd: .6,
      love: "quality", near: "downtown" });
  idea("city-lights", "🏙️", "City lights at night",
    "Find the highest public viewpoint in town and look at the lights.",
    { cost: 0, mins: 60, setting: "outdoor", times: "night", travel: 2, adventure: .3, active: .1, crowd: .3,
      love: "touch quality", near: "downtown" });
  idea("end-of-the-line", "🚇", "Ride to the end of the line",
    "Take a train or bus to the last stop and explore whatever is there.",
    { cost: 1, mins: 180, setting: "either", times: "morning afternoon", travel: 2, adventure: .8, active: .3, crowd: .6,
      love: "quality", near: "downtown" });
  idea("small-town-day-trip", "🏘️", "Small-town day trip",
    "Pick a little town an hour away, find its diner, its main street, and its weirdest shop.",
    { cost: 2, mins: 480, setting: "either", times: "morning afternoon", travel: 3, adventure: .7, active: .4, crowd: .4, food: .4,
      love: "quality" });
  idea("hot-air-balloon", "🎈", "Hot air balloon ride",
    "Splurge on a sunrise balloon flight. Unforgettable.",
    { cost: 3, mins: 240, setting: "outdoor", times: "morning", travel: 3, adventure: 1, active: .1, crowd: .2,
      love: "quality touch" });

  // ---------- 18+ ----------
  idea("weekend-getaway", "🧳", "Weekend getaway",
    "Book a cheap stay in a town a couple hours away and make a loose plan.",
    { cost: 3, mins: 2880, setting: "either", times: "any", travel: 3, adventure: .7, active: .4, crowd: .4,
      love: "quality touch", minAge: 18 });
  idea("staycation", "🏨", "Hotel staycation",
    "Book a night somewhere with a pool in your own city and act like tourists.",
    { cost: 3, mins: 1440, setting: "indoor", times: "afternoon evening", travel: 1, adventure: .3, active: .2, crowd: .3,
      love: "quality touch", minAge: 18 });
  idea("couples-massage", "💆", "Couples massage",
    "Book side-by-side massages. Spend the rest of the day melted.",
    { cost: 3, mins: 90, setting: "indoor", times: "afternoon", travel: 2, adventure: .2, active: 0, crowd: .1,
      love: "touch", minAge: 18 });

  // ---------- 21+ ----------
  idea("brewery-tour", "🍺", "Brewery tour",
    "Do the tour, split a flight, and rank them.",
    { cost: 2, mins: 120, setting: "indoor", times: "afternoon evening", travel: 2, adventure: .4, active: .2, crowd: .7, food: .4,
      love: "quality", minAge: 21, foods: "gluten" });
  idea("wine-tasting", "🍷", "Wine tasting",
    "Visit a winery or tasting room and pretend you know what \"notes of oak\" means.",
    { cost: 3, mins: 150, setting: "either", times: "afternoon", travel: 3, adventure: .3, active: .1, crowd: .5, food: .5,
      love: "quality", minAge: 21 });
  idea("cocktail-class", "🍸", "Cocktail-making class",
    "Learn three classic drinks, then invent one named after the two of you.",
    { cost: 3, mins: 120, setting: "indoor", times: "evening", travel: 2, adventure: .5, active: .2, crowd: .5, food: .4,
      love: "quality", minAge: 21 });
  idea("rooftop-bar", "🌃", "Rooftop bar at sunset",
    "Get there before sunset and stay for the city lights.",
    { cost: 3, mins: 120, setting: "outdoor", times: "evening night", travel: 2, adventure: .3, active: .1, crowd: .7,
      love: "quality touch", near: "downtown", minAge: 21, months: "4 5 6 7 8 9 10" });
  idea("pub-trivia", "🍻", "Pub trivia",
    "Team of two versus the regulars. Pick the dumbest team name allowed.",
    { cost: 1, mins: 120, setting: "indoor", times: "evening", travel: 2, adventure: .4, active: .1, crowd: .7, food: .3,
      interests: "nerdy gamer", love: "quality", minAge: 21 });
  idea("speakeasy", "🥃", "Find a speakeasy",
    "Look up a hidden bar in {city}, find the secret door, and order the bartender's pick.",
    { cost: 3, mins: 120, setting: "indoor", times: "night", travel: 2, adventure: .6, active: .1, crowd: .5,
      love: "quality", near: "downtown", minAge: 21 });
  idea("jazz-bar", "🎷", "Jazz bar",
    "Sit near the band, order something classic, and stay for the second set.",
    { cost: 2, mins: 150, setting: "indoor", times: "night", travel: 2, adventure: .3, active: 0, crowd: .6,
      interests: "musical", love: "quality touch", minAge: 21 });
  idea("bar-pool-darts", "🎱", "Pool and darts",
    "Find a bar with a pool table. Best of three, loser buys the next round.",
    { cost: 1, mins: 120, setting: "indoor", times: "night", travel: 2, adventure: .4, active: .3, crowd: .6,
      interests: "gamer sporty", love: "quality", minAge: 21 });
  idea("paint-and-sip", "🖌️", "Paint-and-sip class",
    "An instructor walks you through a painting, glass of wine in hand.",
    { cost: 2, mins: 120, setting: "indoor", times: "evening", travel: 2, adventure: .3, active: .1, crowd: .6,
      interests: "artsy", love: "quality gifts", minAge: 21 });

  if (typeof module !== "undefined" && module.exports) module.exports = IDEAS;
  else root.DATE_IDEAS = IDEAS;
})(this);
