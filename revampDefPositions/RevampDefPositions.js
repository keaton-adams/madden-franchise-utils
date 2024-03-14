// Requirements
const Franchise = require('madden-franchise');
const prompt = require('prompt-sync')();
const FranchiseUtils = require('../lookupFunctions/FranchiseUtils');
const PLAYER_TABLE = 1612938518;

console.log("This tool will modernize the LB and DL positions in the game. DT will be bigger players that are better at clogging the middle. DE will be EDGE players that are better at rushing the passer and getting into the backfield. MLB will be linebackers that are better in coverage, stopping the run, and playing off the ball. OLB will no longer exist.\n\n")
const gamePrompt = '24';
const autoUnempty = false;
const franchise = FranchiseUtils.selectFranchiseFile(gamePrompt,autoUnempty);

async function revampPositions(franchise) {
  console.log("Doing the stuff...")
  var edges = [];
  var edgesIndex = 0;

  const playerTable = franchise.getTableByUniqueId(PLAYER_TABLE);
  await playerTable.readRecords();

  for (let i = 0; i < playerTable.header.recordCapacity; i++) {
    if (!playerTable.records[i].isEmpty) {
      var player = {
        pos: playerTable.records[i]['Position'],
        age: playerTable.records[i]['Age'] ,
        name: playerTable.records[i]['LastName'],
        team: playerTable.records[i]['TeamIndex'],
        ovr: playerTable.records[i]['OverallRating'],
        arch: playerTable.records[i]['PlayerType'],
        wgh: playerTable.records[i]['Weight'], // From a base of 160 (ie wgh val of 140 = 300lbs)
        spd: playerTable.records[i]['SpeedRating'],
        str: playerTable.records[i]['StrengthRating'],
        fmv: playerTable.records[i]['FinesseMovesRating'],
        pmv: playerTable.records[i]['PowerMovesRating'],
        bsh: playerTable.records[i]['BlockSheddingRating'],
        zcv: playerTable.records[i]['ZoneCoverageRating']
      };

      var newPosition = player.pos;
      // Change DEs that should be interior DL to DT
      if (player.pos === 'LE' || player.pos === 'RE') {
        // Player is RunStopper and 270lbs+, they should be DT
        if (player.arch === 'DE_RunStopper' && player.wgh >= 110) {
          newPosition = 'DT';
          // console.log(player);
          // console.log("RUN STOPPER: Changing from ", player.pos, " to ", newPosition);
        }
        // Player is 290lbs+ or 270lbs+ with extremely high strength and blockshed (Aaron Donald), they should be a DT
        else if (player.wgh >= 130 || (player.wgh >= 110 && player.str >= 95 && player.bsh >= 95)) {
          newPosition = 'DT';
          // console.log(player);
          // console.log("WEIGHT: Changing from ", player.pos, " to ", newPosition);
        }
      }

      // Change OLBs to either EDGE (outside rusher) or MLB (off-ball LB)
      if (player.pos === 'LOLB' || player.pos === 'ROLB') {

        // Player should be off-ball LB
        if (player.arch === 'OLB_PassCoverage' || player.arch === 'OLB_RunStopper' || player.arch.includes("MLB_")) {
          newPosition = 'MLB';
        }
        // Player should be EDGE
        else {
          if (i % 2 !== 0) {
            newPosition = 'LE';
          }
          else {
            newPosition = 'RE';
          }
        }
        // if (playerTable.records[i]['YearsPro'] < 1){
        //   console.log("\n", player);
        //   console.log("Changing from ", player.pos, " to ", newPosition);
        // }
      }

      // Change the position
      playerTable.records[i]['Position'] = newPosition;

      // Add the player to the array for rebalancing
      if (newPosition === 'LE'){
        edges[edgesIndex] = {playerIndex: i, team: player.team, LE: 1, RE: 0, OVR: player.ovr};
        edgesIndex++;
      }
      else if (newPosition === 'RE'){
        edges[edgesIndex] = {playerIndex: i, team: player.team, LE: 0, RE: 1, OVR: player.ovr};
        edgesIndex++;
      }
    }
  }
  await rebalanceEdges(edges);
  console.log("\nDone!\n")
}

async function rebalanceEdges(edges){
  const playerTable = franchise.getTableByUniqueId(PLAYER_TABLE);
  await playerTable.readRecords();

  const visitedTeams = {};
  edges.forEach(edge => {
    const { team } = edge;
    
    // Check if the team index is already visited
    if (!visitedTeams[team]) {
      // Filter edges for this team
      const teamEdges = edges.filter(e => e.team === team);
      teamEdges.sort((a, b) => b.OVR - a.OVR);
      // Randomize if we start by putting the best EDGE at LE or RE
      let isRE = edge.playerIndex % 2 !== 0;
      teamEdges.forEach(edgePlayer => {
        if (isRE) {
          edgePlayer.RE = 1;
          edgePlayer.LE = 0;
          playerTable.records[edgePlayer.playerIndex]['Position'] = 'RE';
        }
        else {
          edgePlayer.RE = 0;
          edgePlayer.LE = 1;
          playerTable.records[edgePlayer.playerIndex]['Position'] = 'LE';
        }
        isRE = !isRE;
      });
      
      // Perform actions on teamEdges, for example:
      // console.log('Team edges:', teamEdges);
  
      // Mark this team index as visited
      visitedTeams[team] = true;
    }
  });
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
      await revampPositions(franchise);
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