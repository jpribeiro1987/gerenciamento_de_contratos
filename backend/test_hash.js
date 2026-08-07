const bcrypt = require('bcrypt');

async function test() {
  const hash = '$2b$10$8.M3C0Y.B2W8F/Q.H/v21.z7vA9O6kY/G4T0.T1oW5Y6Y7k1X1v1W';
  const match = await bcrypt.compare('mudar123', hash);
  console.log('Matches:', match);

  if (!match) {
    const newHash = await bcrypt.hash('mudar123', 10);
    console.log('Correct hash for mudar123:', newHash);
  }
}
test();
