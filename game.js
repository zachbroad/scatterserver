import fs from "fs";
import shuffle from "lodash/shuffle.js";

const GameOptions = {
  roundDuration: 120,
  difficulty: "NORMAL", // EASY, NORMAL, HARD, ANY
  count: 20,
};

class Game {

  constructor(letter = "A") {
    this.rounds = Game.NUMBER_OF_ROUNDS;

    this.currentRound = 1;
    this.cards = Game.generateCards();
    this.results = {};

    this.setOfLetters = Game.DICE_LETTERS;
    this.letter = letter;

    this.lobbyDuration = Game.LOBBY_DURATION; // just for showing countdown on client
    this.resultsDuration = Game.RESULTS_DURATION;
    this.roundDuration = Game.ROUND_DURATION;

    this.setPromptsToThisRound();
  }


  // Timer
  static LOBBY_DURATION = 3;
  static NUMBER_OF_ROUNDS = 3;
  static RESULTS_DURATION = 60;
  static ROUND_DURATION = 90;
  static WAIT_FOR_ANSWERS_DURATION = 4;

  // Scattergories letters
  static DICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "W"];
  static EASY_LETTERS = ["A", "E", "I", "O", "U", "B", "C", "D", "G", "L", "M", "N", "P", "R", "S", "T"];
  static ANY_LETTER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  static HARD_LETTERS = ["Q", "U", "V", "X", "Y", "Z", "J", "K", "W"];

  static generateRandomPrompts(count = 20) {
    let data = [];
    const fileData = fs.readFileSync("prompts.txt", "utf8");
    data = shuffle(fileData.split(/\n/)).slice(0, count);
    return data;
  }

  // TODO: randomly without duplicates for 3
  static generateCard() {
    return this.generateRandomPrompts();
  }

  static generateCards() {
    return [this.generateCard(), this.generateCard(), this.generateCard()];
  }

  // Return new Game with a random letter
  static generateNewGame() {
    const g = new Game();
    g.setOfLetters = Game.DICE_LETTERS; // TODO get config
    g.letter = g.getLetterFromList();
    return g;
  }


  setPromptsToThisRound() {
    this.currentPrompts = this.cards[this.currentRound];
  }

  getLetterFromList() {
    return this.setOfLetters[Math.floor(Math.random() * this.setOfLetters.length)];
  }
}

export default Game;
