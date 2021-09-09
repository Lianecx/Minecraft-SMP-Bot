const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { token, clientId } = require('../config.json');
const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');

const commands = [];

const guildId = '844156404477853716';

const commandFolders = fs.readdirSync('./commands/');
for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./commands/${folder}`);
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
        if(command.data) {
            commands.push(command.data.toJSON());
        }
	}
}

const helpData = new SlashCommandBuilder()
	.setName('help')
	.setDescription('Detailed Description of every command.')
	.addStringOption(option =>
		option.setName('command')
		.setDescription('Set the command of which you want to get information.')
		.setRequired(false)
	);

//Still Help SlashCommandBuilder
helpData.options[0].choices = [];
for (const folder of commandFolders) {
	helpData.options[0].choices.push({ name: folder, value: folder });
	const commandFiles = fs.readdirSync(`./commands/${folder}`);
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
        if(command.data) {
        	helpData.options[0].choices.push({ name: command.name, value: command.name });
        }
	}
}
commands.push(helpData.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		/*await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);*/

		await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		console.log('Successfully reloaded application (/) commands.');
	} catch (err) {
		console.log('Error while reloading application (/) commands.', err);
	}
})();