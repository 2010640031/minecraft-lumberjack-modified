const mineflayer = require('mineflayer');
const collectBlock = require('mineflayer-collectblock').plugin;

const bot = mineflayer.createBot({
  host: 'localhost',
  port: 25565,
  username: 'mineflayer',
});

bot.loadPlugin(collectBlock);

let mcData;
bot.once('login', () => {
  mcData = require('minecraft-data')(bot.version);
});

let attackCooldown = false;

function countLogsInInventory() {
  const logTypes = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log'];
  let totalLogs = 0;

  for (const type of logTypes) {
    const item = bot.inventory.items().find(item => item.name === type);
    if (item) {
      totalLogs += item.count;
    }
  }

  return totalLogs;
}

bot.on('chat', async (username, message) => {
  const args = message.split(' ');
  if (args[0] !== 'chop') return;

  let type = 'oak_log';
  if (args.length >= 2) type = args[1];

  bot.chat('start');

  while (countLogsInInventory() < 64) {
    const blockType = mcData.blocksByName[type];
    if (!blockType) {
      bot.chat(`not found ${type}.`);
      return;
    }

    const blocks = bot.findBlocks({
      matching: blockType.id,
      maxDistance: 64,
      count: 64,
    }).filter(block => bot.canSeeBlock(bot.blockAt(block)));

    if (blocks.length === 0) {
      bot.chat("nothing found");
      return;
    }

    const targets = blocks.map(block => bot.blockAt(block));

    bot.chat(`Gefunden ${targets.length} ${type}(s)`);

    try {
      await bot.collectBlock.collect(targets);
      bot.chat('done');
    } catch (err) {
      bot.chat(err.message);
      console.log(err);
    }
  }
});

const maxDistance = 5;

bot.on('physicTick', () => {
  if (attackCooldown) return;

  const mobFilter = e => e.type === 'mob' && (e.displayName === 'Zombie' || e.displayName === 'Skeleton' || e.displayName === 'Spider');
  const mob = bot.nearestEntity(mobFilter);

  if (mob) {
    const distance = bot.entity.position.distanceTo(mob.position);

    if (distance < maxDistance) {
      bot.lookAt(mob.position.offset(0, mob.height, 0), true);
      bot.attack(mob, true);
      attackCooldown = true;
      setTimeout(() => {
        attackCooldown = false;
      }, 25 * 50); // 25 Ticks, 1 Tick = 50ms
    }
  }
});

