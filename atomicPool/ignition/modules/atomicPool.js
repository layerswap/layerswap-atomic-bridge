const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("atomicPoolModule", (m) => {
  const atomicPool = m.contract('AtomicPool', ['0x01C4036143c56Ff343C4D980b5b6F9D7C86819e1']);
  return { atomicPool };
});
