const TelegramBot = require('node-telegram-bot-api');
const Jimp = require('jimp');
const fs = require('fs').promises;
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;

const bot = new TelegramBot(token, { polling: true });

const imageProcessingState = {};

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Bot is online! Send an image then use commands /cook, /dissolve, /toptext, /bottomtext to manipulate and add text to the image! Use /print to recieve your edited image');
});

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const photo = msg.photo[msg.photo.length - 1].file_id;

  try {
    const filePath = await bot.downloadFile(photo, ".");

    imageProcessingState[userId] = {
      filePath,
      modifications: [],
    };
    await bot.sendMessage(chatId, 'image downloaded successfully.');
  } catch (error) {
    console.error("Error downloading image", error);
    bot.sendMessage(chatId, 'Error downloading image. Please try again.');
  }
});

bot.onText(/\/cook/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (imageProcessingState[userId]) {
    try {
      const currentImagePath = imageProcessingState[userId].filePath;
      const image = await Jimp.read(currentImagePath);
      
      image.pixelate(2);
      image.quality(5);
      
      await image.writeAsync(currentImagePath);
      imageProcessingState[userId].filePath = currentImagePath;
      await bot.sendMessage(chatId, 'Image has been cooked!');
    } catch (error) {
      console.error("Error applying /cook operation", error);
      bot.sendMessage(chatId, 'Error in cooking. Please try again.');
    }
  } else {
    bot.sendMessage(chatId, 'No active session. Send an image to get started.');
  }
});

bot.onText(/\/dissolve/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (imageProcessingState[userId]) {
    try {
      const currentImagePath = imageProcessingState[userId].filePath;

      const image = await Jimp.read(currentImagePath);
      image.displace(image, 100);
      await image.writeAsync(currentImagePath);
      imageProcessingState[userId].filePath = currentImagePath;
      await bot.sendMessage(chatId, 'Image has been dissolved!');
    } catch (error) {
      console.error("Error applying /dissolve operation", error);
      bot.sendMessage(chatId, 'Error in dissolve. Please try again.');
    }
  } else {
    bot.sendMessage(chatId, 'No active session. Send an image to get started.');
  }
});

bot.onText(/\/print/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (imageProcessingState[userId]) {
    try {
      const currentImagePath = imageProcessingState[userId].filePath;

      await bot.sendPhoto(chatId, currentImagePath);

      delete imageProcessingState[userId];
      await fs.unlink(currentImagePath);
    } catch (error) {
      console.error("Error sending image", error);
      bot.sendMessage(chatId, 'Error sending image');
    }
  } else {
    bot.sendMessage(chatId, 'No active session');
  }
});

bot.onText(/\/bottomtext (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (imageProcessingState[userId]) {
    try {
      const currentImagePath = imageProcessingState[userId].filePath;
      const image = await Jimp.read(currentImagePath);
      const bottomText = match[1];
      const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
      const outline = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
      const outlineOffset = 2;
      const maxLineWidth = Math.floor(image.bitmap.width * 0.75);
      const lines = [];
      let currentLine = '';
      for (const char of bottomText) {
        currentLine += char;

        if (Jimp.measureText(font, currentLine) > maxLineWidth && /\s/.test(char)) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }

      if (currentLine.trim() !== '') {
        lines.push(currentLine.trim());
      }
      const lineHeight = Jimp.measureTextHeight(font, currentLine);
      const y = image.bitmap.height - lineHeight;
      
      const reversedLines = lines.reverse();
      
      reversedLines.forEach((line, index) => {
        image.print(outline, (image.bitmap.width - Jimp.measureText(outline, line)) / 2 - outlineOffset, y - index * lineHeight - outlineOffset, line);
        image.print(outline, (image.bitmap.width - Jimp.measureText(outline, line)) / 2 + outlineOffset, y - index * lineHeight - outlineOffset, line);
        image.print(outline, (image.bitmap.width - Jimp.measureText(outline, line)) / 2 - outlineOffset, y - index * lineHeight + outlineOffset, line);
        image.print(outline, (image.bitmap.width - Jimp.measureText(outline, line)) / 2 + outlineOffset, y -  index * lineHeight + outlineOffset, line);

        image.print(font, Math.floor((image.bitmap.width - Jimp.measureText(font, line)) / 2), y - index * lineHeight, line);
      });

      await image.writeAsync(currentImagePath);
      imageProcessingState[userId].filePath = currentImagePath;
      await bot.sendMessage(chatId, 'bottom text added');
    } catch (error) {
      console.error("bottom text broken", error);
      bot.sendMessage(chatId, 'error building bottom text');
    }
  } else {
    bot.sendMessage(chatId, 'No active session. Send an image to get started');
  }
});

bot.onText(/\/toptext (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (imageProcessingState[userId]) {
    try {
      const currentImagePath = imageProcessingState[userId].filePath;
      const image = await Jimp.read(currentImagePath);
      const topText = match[1];
      const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
      const outline = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
      const outlineOffset = 2;
      const maxLineWidth = Math.floor(image.bitmap.width * 0.75);
      const lines = [];
      let currentLine = '';
      for (const char of topText) {
        currentLine += char;

        if (Jimp.measureText(font, currentLine) > maxLineWidth && /\s/.test(char)) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }

      if (currentLine.trim() !== '') {
        lines.push(currentLine.trim());
      }
      const lineHeight = Jimp.measureTextHeight(font, currentLine);
      const y = 10;
      
      lines.forEach((line, index) => {
        image.print(outline, Math.floor((image.bitmap.width - Jimp.measureText(outline, line)) / 2) - outlineOffset, y + index * lineHeight - outlineOffset, line);
        image.print(outline, Math.floor((image.bitmap.width - Jimp.measureText(outline, line)) / 2) + outlineOffset, y + index * lineHeight - outlineOffset, line);
        image.print(outline, Math.floor((image.bitmap.width - Jimp.measureText(outline, line)) / 2) - outlineOffset, y + index * lineHeight + outlineOffset, line);
        image.print(outline, Math.floor((image.bitmap.width - Jimp.measureText(outline, line)) / 2) + outlineOffset, y + index * lineHeight + outlineOffset, line);

        image.print(font, Math.floor((image.bitmap.width - Jimp.measureText(font, line)) / 2), y + index * lineHeight, line);
      });

      await image.writeAsync(currentImagePath);
      imageProcessingState[userId].filePath = currentImagePath;
      await bot.sendMessage(chatId, 'top text added');
    } catch (error) {
      console.error("top text broken", error);
      bot.sendMessage(chatId, 'error building top text');
    }
  } else {
    bot.sendMessage(chatId, 'No active session. Send an image to get started');
  }
});
