class Game {
  static ROUND_DURATION = 3;
  static LOBBY_DURATION = 3;
  static RESULTS_DURATION = 5000;
  static WAIT_FOR_ANSWERS_DURATION = 2;
  static ROUNDS = 3;

  static PROMPTS = [
    "Types of flowers",
    "Capital cities",
    "Famous authors",
    "Items found in a toolbox",
    "Cartoon characters",
    "Car brands",
    "Movie titles",
    "Elements on the periodic table",
    "Dog breeds",
    "Things you find in a kitchen",
    "Musical instruments",
    "Olympic sports",
    "Celestial bodies",
    "Types of cheese",
    "Breakfast foods",
    "Fruits",
    "World leaders",
    "Names of rivers",
    "Sea creatures",
    "Universities or colleges"
  ];

  // TODO: randomly without duplicates for 3
  static generateCard() {
    return this.PROMPTS;
  }

  static generateCards() {
    return [this.PROMPTS, this.PROMPTS, this.PROMPTS];
  }

  constructor(letter) {
    this.roundDuration = Game.ROUND_DURATION;
    this.rounds = Game.ROUNDS;
    this.lobbyDuration = Game.LOBBY_DURATION; // just for showing countdown on client
    this.resultsDuration = Game.RESULTS_DURATION;
    // this.score = {};
    this.currentRound = 1;
    this.cards = Game.generateCards();
    this.setPrompsToThisRound();
    this.results = {}
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
