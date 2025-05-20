function setup() {
  let selectedDifficulty = "easy";

  // button clicks for difficulty
  $(".difficulty").on("click", function () {
    selectedDifficulty = $(this).data("diff");

    $(".difficulty").removeClass("selected");
    $(this).addClass("selected");
  });

  // start button logic
  $("#start").on("click", function () {
    $("#start").addClass("selected");
    $("#reset").removeClass("selected");

    let totalPairs = 3;
    let timeLimit = 100;
    let columns = 3;
    let rows = 2;

    if (selectedDifficulty === "medium") {
      totalPairs = 6;
      timeLimit = 200;
      columns = 4;
      rows = 3;
    } else if (selectedDifficulty === "hard") {
      totalPairs = 15;
      timeLimit = 300;
      columns = 6;
      rows = 5;
    }

    startGame(totalPairs, timeLimit, columns, rows);
  });

  // reset button logic stuff
  $("#reset").on("click", function () {
    $("#reset").addClass("selected");
    $("#start").removeClass("selected");
    location.reload(); 
  });

  // dark mode 
  $("#dark").on("click", function () {
    $("#game_grid").addClass("dark-mode");
    $("#dark, #light").removeClass("selected");
    $(this).addClass("selected");
  });

  // light mode 
  $("#light").on("click", function () {
    $("#game_grid").removeClass("dark-mode");
    $("#dark, #light").removeClass("selected");
    $(this).addClass("selected");
  });
}

// core game logic
function startGame(totalPairs, timeLimit, columns, rows) {
  const cardContainer = $("#game_grid");
  cardContainer.css({
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, 100px)`,
    gridTemplateRows: `repeat(${rows}, 100px)`
  });

  const message = $("#message");
  const timeDisplay = $("#time");
  const clickDisplay = $("#clicks");
  const matchedDisplay = $("#matched");
  const remainingDisplay = $("#remaining");
  const totalDisplay = $("#total");
  const timerText = $("#timerText");

  // clears any existing timer
  if (window.gameTimer) {
    clearInterval(window.gameTimer);
  }

  // game state variables
  // this reset all states
  let firstCard = null;
  let secondCard = null;
  let boardLocked = false;
  let matchCount = 0;
  let clickCount = 0;
  let wrongMatchCount = 0;
  let powerUsed = false;

  message.text("");

  // resets the displays before API call
  timeDisplay.text(timeLimit);
  clickDisplay.text("0");
  matchedDisplay.text("0");
  remainingDisplay.text(totalPairs);
  totalDisplay.text(totalPairs);
  timerText.text(`You got ${timeLimit} seconds. 0 seconds passed!`);

  // fetch Pokémon list with error handling
  $.ajax({
    url: "https://pokeapi.co/api/v2/pokemon?limit=1500",
    type: "GET",
    success: function(data) {
      const allPokemon = data.results;
      const selectedIndexes = [];
      const shuffledIndices = [...Array(allPokemon.length).keys()].sort(() => Math.random() - 0.5);

      // choose random unique Pokémon more efficiently using pre-shuffled array
      for (let i = 0; i < Math.min(totalPairs, shuffledIndices.length); i++) {
        selectedIndexes.push(shuffledIndices[i]);
      }

      // this gets the details of selected Pokémon
      const promises = selectedIndexes.map(index => {
        return $.ajax({
          url: allPokemon[index].url,
          type: "GET",
          error: function() {
            return { sprites: { other: { "official-artwork": { front_default: "back.webp" } } } };
          }
        });
      });

      Promise.all(promises).then(responses => {
        const images = [];

        responses.forEach(pokemon => {
          const imgUrl = pokemon.sprites.other["official-artwork"].front_default;
          if (imgUrl) {
            images.push(imgUrl, imgUrl);
          }
        });

        // this makes sure theres have enough pairs
        while (images.length < totalPairs * 2) {
          // Use default image if we couldn't load enough Pokémon
          images.push("back.webp", "back.webp");
        }

        // shuffles cards
        images.sort(() => Math.random() - 0.5);
        cardContainer.empty();

        // create cards
        images.forEach((imgSrc, index) => {
          const card = $(`
            <div class="card">
              <img id="img${index}" class="front_face" src="${imgSrc}" alt="Pokemon card">
              <img class="back_face" src="back.webp" alt="Card back">
            </div>
          `);
          cardContainer.append(card);
        });

        // card on click handler
        $(".card").on("click", function () {
          // prevent clicks if board is locked or card is already flipped
          if (boardLocked || $(this).hasClass("flip")) return;
          
          // prevent double clicks on same card
          if (firstCard && firstCard[0] === this) return;

          $(this).addClass("flip");
          clickCount++;
          clickDisplay.text(`${clickCount}`);

          if (!firstCard) {
            firstCard = $(this);
            return;
          }

          secondCard = $(this);
          boardLocked = true; // locks board immediately after second card is selected
          
          const firstImgSrc = firstCard.find(".front_face")[0].src;
          const secondImgSrc = secondCard.find(".front_face")[0].src;

          if (firstImgSrc === secondImgSrc) {
            // match found
            firstCard.off("click");
            secondCard.off("click");
            firstCard = null;
            secondCard = null;
            boardLocked = false;

            matchCount++;
            matchedDisplay.text(`${matchCount}`);
            remainingDisplay.text(`${totalPairs - matchCount}`);

            if (matchCount === totalPairs) {
              clearInterval(window.gameTimer);
              message.text("Congratulations! You Win!");
            }
          } else {
            // no match
            wrongMatchCount++;

            // power up logic
            if (wrongMatchCount >= 5 && !powerUsed) {
              powerUsed = true;
              if (confirm("You've made 5 mistakes. Use a Power-Up?")) {
                $(".card").addClass("flip");
                message.text("Power-Up Activated!");
                setTimeout(() => {
                  $(".card").removeClass("flip");
                  $(".card").each(function() {
                    if ($(this).data("matched")) {
                      $(this).addClass("flip");
                    }
                  });
                  message.text("");
                  firstCard = null;
                  secondCard = null;
                  boardLocked = false;
                }, 3000);
                return;
              } else {
                // user declined power-up
                firstCard.removeClass("flip");
                secondCard.removeClass("flip");
                firstCard = null;
                secondCard = null;
                boardLocked = false;
              }
            } else {
              // This temporarily locks the board and unflips after delay
              setTimeout(() => {
                firstCard.removeClass("flip");
                secondCard.removeClass("flip");
                firstCard = null;
                secondCard = null;
                boardLocked = false;
              }, 1000);
            }
          }
        });

        // timer countdown
        let currentTime = timeLimit;
        window.gameTimer = setInterval(() => {
          currentTime--;
          timeDisplay.text(`${currentTime}`);
          const secondsPassed = timeLimit - currentTime;
          timerText.text(`You got ${timeLimit} seconds. ${secondsPassed} seconds passed!`);

          if (currentTime <= 0) {
            clearInterval(window.gameTimer);
            message.text("Game Over");
            boardLocked = true; // Lock the board
            $(".card").off("click");
          }
        }, 1000);
      });
    },
  });
}

$(document).ready(setup);
