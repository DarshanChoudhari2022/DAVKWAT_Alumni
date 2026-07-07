const net = require('net');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'sa-east-1',
  'af-south-1',
  'me-central-1'
];

const username = 'postgres.jaeuirztfbozglvfrfav';

function testRegion(region) {
  return new Promise((resolve) => {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const socket = new net.Socket();
    
    socket.setTimeout(3000);
    
    socket.connect(5432, host, () => {
      // Send standard PG startup packet
      // Packet size: 4 (length) + 4 (protocol version 3.0) + name/value pairs for user and database + null terminator
      const user = username;
      const database = 'postgres';
      
      const userLen = Buffer.byteLength(user) + 1;
      const dbLen = Buffer.byteLength(database) + 1;
      const totalLen = 4 + 4 + 5 + userLen + 9 + dbLen + 1; // 5 for 'user\0', 9 for 'database\0', 1 for final '\0'
      
      const buf = Buffer.alloc(totalLen + 4);
      buf.writeInt32BE(totalLen + 4, 0); // Length of packet (including length word itself)
      buf.writeInt32BE(196608, 4); // Protocol version 3.0
      
      let pos = 8;
      buf.write('user\0', pos); pos += 5;
      buf.write(user + '\0', pos); pos += userLen;
      buf.write('database\0', pos); pos += 9;
      buf.write(database + '\0', pos); pos += dbLen;
      buf.write('\0', pos);
      
      socket.write(buf);
    });

    socket.on('data', (data) => {
      const response = data.toString('utf8');
      if (response.includes('tenant/user') && response.includes('not found')) {
        console.log(`Region ${region}: Tenant not found`);
      } else {
        console.log(`Region ${region} INTERESTING response:`, response.slice(0, 100).replace(/\r?\n|\r/g, ' '));
      }
      socket.destroy();
      resolve();
    });

    socket.on('error', (err) => {
      // console.log(`Region ${region} unreachable: ${err.message}`);
      socket.destroy();
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve();
    });
  });
}

async function run() {
  for (const region of regions) {
    await testRegion(region);
  }
}

run();
