// Practice hands in the style of an American mahjong card.
// These are made up for learning. They are NOT the official NMJL card, which changes every year;
// add the hands from your own card on the "My card" screen.
(function (root) {
  "use strict";
  const PRACTICE_HANDS = [
    { id: "p-yr1", category: "Year 2026", name: "Flowers and the year", pattern: "FFF 2026a 2222b 666b", points: 25 },
    { id: "p-yr2", category: "Year 2026", name: "Two years, North and South", pattern: "2026a 2026b NNN SSS", points: 30 },
    { id: "p-yr3", category: "Year 2026", name: "Twos around the Soaps", pattern: "222a 0000 2222b 666a", points: 25 },

    { id: "p-ev1", category: "2468", name: "Evens in one suit", pattern: "222a 4444a 666a 8888a", points: 25 },
    { id: "p-ev2", category: "2468", name: "Evens, two suits", pattern: "FF 2222a 44b 66b 8888a", points: 25 },
    { id: "p-ev3", category: "2468", name: "Evens with dragons", pattern: "22a 444a 66b 888b DDDDb", points: 30 },

    { id: "p-lk1", category: "Like numbers", name: "Same number, three suits", pattern: "FF 1111a 1111b 1111c", points: 25, slide: true },
    { id: "p-lk2", category: "Like numbers", name: "Like numbers with their dragons", pattern: "1111a DDDa 1111b DDDb", points: 30, slide: true },

    { id: "p-cr1", category: "Consecutive run", name: "Five in a row, one suit", pattern: "11a 222a 3333a 444a 55a", points: 25, slide: true },
    { id: "p-cr2", category: "Consecutive run", name: "Three in a row, three suits", pattern: "FFF 1111a 2222b 333c", points: 25, slide: true },
    { id: "p-cr3", category: "Consecutive run", name: "Four in a row, two suits", pattern: "111a 2222a 333b 4444b", points: 25, slide: true },

    { id: "p-od1", category: "13579", name: "Odds in one suit", pattern: "11a 333a 5555a 777a 99a", points: 25 },
    { id: "p-od2", category: "13579", name: "Flowers and low odds", pattern: "FFFF 111a 333b 5555c", points: 25 },
    { id: "p-od3", category: "13579", name: "High odds and a dragon", pattern: "FF 555a 777a 999a DDDb", points: 25 },

    { id: "p-ws1", category: "Winds and dragons", name: "All four winds", pattern: "NNNN EEE WWW SSSS", points: 25 },
    { id: "p-ws2", category: "Winds and dragons", name: "All three dragons", pattern: "FF DDDDa DDDDb DDDDc", points: 30 },
    { id: "p-ws3", category: "Winds and dragons", name: "NEWS and like numbers", pattern: "NEWS 111a 111b 1111c", points: 30, slide: true },

    { id: "p-36", category: "369", name: "Threes and sixes, two suits", pattern: "333a 6666a 333b 6666b", points: 25 },
    { id: "p-369", category: "369", name: "Three, six, nine", pattern: "FF 3333a 66b 66c 9999a", points: 25 },

    { id: "p-qn1", category: "Quints", name: "Quint run", pattern: "11111a 2222b 33333c", points: 40, slide: true },
    { id: "p-qn2", category: "Quints", name: "Flower quint", pattern: "FFFFF 1111a 11111b", points: 40, slide: true },

    { id: "p-sp1", category: "Singles and pairs", name: "Wind pairs and like pairs", pattern: "NN EE WW SS 11a 11b 11c", points: 50, concealed: true, slide: true },
    { id: "p-sp2", category: "Singles and pairs", name: "2468 in every suit", pattern: "FF 2468a 2468b 2468c", points: 50, concealed: true },
    { id: "p-sp3", category: "Singles and pairs", name: "Seven pairs in a row", pattern: "11a 22a 33a 44a 55a 66a 77a", points: 50, concealed: true, slide: true },
  ];
  if (typeof module !== "undefined" && module.exports) module.exports = PRACTICE_HANDS;
  else root.PRACTICE_HANDS = PRACTICE_HANDS;
})(this);
