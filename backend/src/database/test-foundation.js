const foundation=require('./migrations/202611100001_foundation');
const structure=require('./migrations/202611130001_round_papers');
exports.up=async db=>{await foundation.up(db);await structure.up(db);};
exports.down=async db=>{await structure.down(db);await foundation.down(db);};
