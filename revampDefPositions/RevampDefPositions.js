// Requirements
const Franchise = require('madden-franchise');
const prompt = require('prompt-sync')();
const FranchiseUtils = require('../lookupFunctions/FranchiseUtils');
const PLAYER_TABLE = 1612938518;

console.log("This tool will modernize the LB and DL positions in the game. DT will be bigger players that are better at clogging the middle. DE will be EDGE players that are better at rushing the passer and getting into the backfield. MLB will be linebackers that are better in coverage, stopping the run, and playing off the ball. OLB will no longer exist.\n\n")
const gamePrompt = '24';
const autoUnempty = false;
const franchise = FranchiseUtils.selectFranchiseFile(gamePrompt,autoUnempty);

async function generatePlayerMotivations(franchise, removeTags, excludeSchemeFit, includeCurrent) {
  console.log("Doing the stuff...")
  const playerTable = franchise.getTableByUniqueId(PLAYER_TABLE);
  await playerTable.readRecords();

  for (let i = 0; i < playerTable.header.recordCapacity; i++) {
    if (!playerTable.records[i].isEmpty) {
      var player = {
        pos: playerTable.records[i]['Position'],
        age: playerTable.records[i]['Age'] ,
        nam: playerTable.records[i]['LastName'],
        ovr: playerTable.records[i]['OverallRating'],
        arc: playerTable.records[i]['PlayerType'],
        wgh: playerTable.records[i]['Weight'], // From a base of 160 (ie wgh val of 140 = 300lbs)
        spd: playerTable.records[i]['OriginalSpeedRating'],
        str: playerTable.records[i]['OriginalStrengthRating'],
        fmv: playerTable.records[i]['FinesseMovesRating'],
        pmv: playerTable.records[i]['PowerMovesRating'],
        bsh: playerTable.records[i]['BlockSheddingRating'],
        zcv: playerTable.records[i]['ZoneCoverageRating']
      };

      var newPosition = player.pos;
      // Change DEs that should be interior DL to DT
      if (player.pos === 'LE' || player.pos === 'RE') {
        if (player.arc === 'RunStopper' && player.wgh >= 110) {
          newPosition = 'DT';
        }
        else if (player.wgh >= 130) {
          newPosition = 'DT';
        }
      }

      // Change OLBs to either EDGE (outside rusher) or MLB (off-ball LB)
      if (player.pos === 'LOLB' || player.pos === 'ROLB') {
        console.log(player);

        if (i % 2 !== 0) {
          playerTable.records[i]['Position'] = 'MLB';
        }
        else {
          if (i % 2 !== 0) {
            playerTable.records[i]['Position'] = 'LE';
          }
          else {
            playerTable.records[i]['Position'] = 'RE';
          }
        }
        console.log("Changing ", player.pos, " to: ", newPosition);
      }


      // playerTable.records[i]['Position'] = newPosition;
    }
  }
  console.log("\nDone!\n")
}

franchise.on('ready', async function () {

    const gameYear = franchise.schema.meta.gameYear // Get the game year of the source file
    if (gameYear !== 24) {
      console.log("******************************************************************************************")
      console.log("ERROR! Target franchise isn't a Madden 24 Franchise File. Exiting program.");
      console.log("******************************************************************************************")
      prompt()
      process.exit(0);
    }
    
    try {
      var removeTags = false;
      var excludeSchemeFit = false;
      var includeCurrent = false;

      await generatePlayerMotivations(franchise, removeTags, excludeSchemeFit, includeCurrent);
    } catch (e) {
      console.log("******************************************************************************************")
      console.log(`FATAL ERROR!! Please report this message to Sinthros IMMEDIATELY - ${e}`)
      console.log("Exiting program.")
      console.log("******************************************************************************************")
      prompt();
      process.exit(0);
    }
    
  console.log("Successfully modernized all positions.");
  await FranchiseUtils.saveFranchiseFile(franchise);
  console.log("Program completed. Enter anything to exit the program.");
  prompt();
});