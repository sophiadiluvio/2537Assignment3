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

  // game state variables
  let firstCard = null;
  let secondCard = null;
  let boardLocked = false;
  let matchCount = 0;
  let clickCount = 0;
  let wrongMatchCount = 0;
  let powerUsed = false;
  let timer;

  message.text("");

  // fetch Pokémon list
  $.get("https://pokeapi.co/api/v2/pokemon?limit=1500", function (data) {
    const allPokemon = data.results;
    const selectedIndexes = [];

    // choose random unique Pokémon
    while (selectedIndexes.length < totalPairs * 2 && selectedIndexes.length < allPokemon.length) {
      const rand = Math.floor(Math.random() * allPokemon.length);
      if (!selectedIndexes.includes(rand)) {
        selectedIndexes.push(rand);
      }
    }

    // this gets the details of selected Pokémon
    const promises = selectedIndexes.map(index => $.get(allPokemon[index].url));

    Promise.all(promises).then(responses => {
      const images = [];

      responses.slice(0, totalPairs).forEach(pokemon => {
        const imgUrl = pokemon.sprites.other["official-artwork"].front_default;
        if (imgUrl) {
          images.push(imgUrl, imgUrl); // add pair
        }
      });

      // shuffles cards
      images.sort(() => Math.random() - 0.5);
      cardContainer.empty();

      // ths resets the stats
      matchCount = 0;
      clickCount = 0;
      timeDisplay.text(`${timeLimit}`);
      clickDisplay.text(`${clickCount}`);
      matchedDisplay.text(`${matchCount}`);
      remainingDisplay.text(`${totalPairs}`);
      totalDisplay.text(`${totalPairs}`);
      timerText.text(`You got ${timeLimit} seconds. 0 seconds passed!`);

      // this create cards
      images.forEach((imgSrc, index) => {
        const card = $(`
          <div class="card">
            <img id="img${index}" class="front_face" src="${imgSrc}" alt="">
            <img class="back_face" src="back.webp" alt="">
          </div>
        `);
        cardContainer.append(card);
      });

      // card on click handler
      $(".card").on("click", function () {
        if (boardLocked || $(this).hasClass("flip")) return;

        $(this).addClass("flip");
        clickCount++;
        clickDisplay.text(`Clicks: ${clickCount}`);

        if (!firstCard) {
          firstCard = $(this);
          return;
        }

        secondCard = $(this);
        const firstImgSrc = firstCard.find(".front_face")[0].src;
        const secondImgSrc = secondCard.find(".front_face")[0].src;

        if (firstImgSrc === secondImgSrc) {
          // match found
          firstCard.off("click");
          secondCard.off("click");
          firstCard = null;
          secondCard = null;

          matchCount++;
          matchedDisplay.text(`Matches: ${matchCount}`);
          remainingDisplay.text(`Remaining: ${totalPairs - matchCount}`);

          if (matchCount === totalPairs) {
            clearInterval(timer);
            message.text("Congratulations! You Win!");
          }
        } else {
          // no match
          wrongMatchCount++;

          // power up logic
          if (wrongMatchCount >= 5 && !powerUsed) {
            powerUsed = true;
            if (confirm("You've made 5 mistakes. Use a Trigger Power-Up?")) {
              $(".card").addClass("flip");
              message.text("Power-Up Activated!");
              firstCard = null;
              secondCard = null;
              boardLocked = false;

              setTimeout(() => {
                $(".card").removeClass("flip");
                message.text("");
              }, 3000);
              return;
            }
          }

          // Tthis temporarily locks the board and unflip after delay
          boardLocked = true;
          setTimeout(() => {
            firstCard.removeClass("flip");
            secondCard.removeClass("flip");
            firstCard = null;
            secondCard = null;
            boardLocked = false;
          }, 1000);
        }
      });

      // timer countdown
      let currentTime = timeLimit;
      clearInterval(timer);
      timer = setInterval(() => {
        currentTime--;
        timeDisplay.text(`Time: ${currentTime}`);
        const secondsPassed = timeLimit - currentTime;
        timerText.text(`You got ${timeLimit} seconds. ${secondsPassed} seconds passed`);

        if (currentTime === 0) {
          clearInterval(timer);
          message.text("Game Over");
          $(".card").off("click");
        }
      }, 1000);
    });
  });
}

$(document).ready(setup);
