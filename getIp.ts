import os from 'os';

function getLocalIp() {
  const res = Object.values(os.networkInterfaces()).flat().filter(item => item && !item.internal && (item.address.startsWith('192.') || item.address.startsWith('10.')));
  return res[0]?.address;
}

console.log(getLocalIp());
export { getLocalIp }
