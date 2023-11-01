import fs from "fs";
import shuffle from "lodash/shuffle.js";

class Game {
  static LOBBY_DURATION = 3;
  static ROUND_DURATION = 45;
  static WAIT_FOR_ANSWERS_DURATION = 1;
  static RESULTS_DURATION = 60;
  static ROUNDS = 3;

  // static PROMPTS = [
  //   "Types of flowers",
  //   "Capital cities",
  //   "Famous authors",
  //   "Items found in a toolbox",
  //   "Cartoon characters",
  //   "Car brands",
  //   "Movie titles",
  //   "Elements on the periodic table",
  //   "Dog breeds",
  //   "Things you find in a kitchen",
  //   "Musical instruments",
  //   "Olympic sports",
  //   "Celestial bodies",
  //   "Types of cheese",
  //   "Breakfast foods",
  //   "Fruits",
  //   "World leaders",
  //   "Names of rivers",
  //   "Sea creatures",
  //   "Universities or colleges"
  // ];

  static generateRandomPrompts(count=20) {
    let data = [];
    const fileData = fs.readFileSync('prompts.txt', "utf8");
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
    const g =  new Game(String.fromCharCode(65+Math.floor(Math.random() * 26)));
    return g;
  }

  constructor(letter='A') {
    this.roundDuration = Game.ROUND_DURATION;
    this.rounds = Game.ROUNDS;
    this.lobbyDuration = Game.LOBBY_DURATION; // just for showing countdown on client
    this.resultsDuration = Game.RESULTS_DURATION;
    // this.score = {};
    this.currentRound = 1;
    this.cards = Game.generateCards();
    this.setPrompsToThisRound();
    this.results = {}
    this.letter = letter;
  }

  scoreRounds(arrayOfUserAnswers) {
    const currentCard = this.cards[this.currentRound];
    // submit to chatgpt
    // return boolean array of correct/incorrect
  }

  goToNextRound() {
    this.currentRound += 1;

    // Game is over : TODO: should this be handled here?
    if (this.currentRound > Game.ROUND_DURATION) {
      this.gameover();
      return;
    }

    this.setPrompsToThisRound();
  }

  setPrompsToThisRound() {
    this.currentPrompts = this.cards[this.currentRound];
  }

  gameover() {

  }


}

export default Game;
