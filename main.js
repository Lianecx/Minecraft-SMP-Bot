console.log(
    '\x1b[1m'     + // Bold (1)
    '\x1b[44;37m' + // Blue BG (44); White FG (37)
    '%s'          + // Insert second argument
    '\x1b[0m',      // Reset color (0)
    'Loading...'    // Second argument (%s)
);

const fs = require('fs');
const Discord = require('discord.js');
const { AutoPoster } = require('topgg-autoposter');
const plugin = require('./api/plugin');
const helpCommand = require('./src/help');
const disableButton = require('./src/disableButton');
const enableButton = require('./src/enableButton');
const settings = require('./api/settings');
const messages = require('./api/messages');
const { prefix, token, topggToken } = require('./config.json');
const { addPh } = require('./api/messages');
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.DIRECT_MESSAGES] });

//Handle rejected promises
process.on('unhandledRejection', async err => {
    console.log('Unknown promise rejection', err);
});

/*
 * Converts the first letter of a string to uppercase.
 * @returns {String} The formatted string.
 */
String.prototype.cap = function() {
    return this[0].toUpperCase() + this.slice(1, this.length).toLowerCase()
};

if(topggToken) {
    const poster = AutoPoster(topggToken, client);

    poster.on('posted', () => {});
    poster.on('error', () => console.log('Could not post stats to Top.gg!'));
}

client.once('ready', async () => {
    console.log(`Bot logged in as ${client.user.tag} and with prefix: ${prefix}\nBot on ${client.guilds.cache.size} server.`);
    client.user.setActivity('/help', { type: 'LISTENING' });
    await plugin.loadExpress(client);
});

client.on('guildCreate', guild => {
    if(guild?.name === undefined) return console.log(`Received undefined guild in guildCreate event: ${guild}`);
    console.log(`Joined a guild: ${guild.name}: ${guild.memberCount} members.\nBot is now on ${client.guilds.cache.size} servers!`);
});

client.on('guildDelete', async guild => {
    if(guild?.name === undefined) return console.log(`Received undefined guild in guildDelete event: ${guild}`);
    console.log(`Left a guild: ${guild.name}\nBot is now on ${client.guilds.cache.size} servers!`);

    //Fake message
    const message = {};
    message.reply = () => {};
    await plugin.disconnect(guild.id, message);

    //Delete connection folder
    fs.rm(`./serverdata/connections/${guild.id}`, { recursive: true, force: true }, err => {
        if (err) console.log(`No connection file found for guild: ${guild.name}`);
        else console.log(`Successfully deleted connection file of guild: ${guild.name}`);
    });
});

client.commands = new Discord.Collection();
const commandFolders = fs.readdirSync('./commands/');
for (const folder of commandFolders) {
	const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(command => command.endsWith('.js'));
	for (const file of commandFiles) {
		const command = require(`./commands/${folder}/${file}`);
		client.commands.set(command.name, command);
	}
}


client.on('messageCreate', async message => {
    if (!message.content.startsWith(prefix)) plugin.chat(message);

    if(message.content === `<@${client.user.id}>` || message.content === `<@!${client.user.id}>`) return message.reply(':wave: I use slash commands. Type `/help` if you need more help to a specific command.');
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    //Add own response handlers
    message.respond = (key, ...placeholders) => {
        return messages.reply(message, key, ...placeholders);
    }
    message.reply = (options) => {
        return messages.replyOptions(message, options);
    }

    message.respond(messages.keys.commands.executed.console);

    if(commandName === 'help') helpCommand.execute(message, args);
    else {
        const command = client.commands.get(commandName);
        if (!command) console.log(`${message.member.user.tag} executed non-existent command ${commandName} in ${message.guild.name}`);
        else {
            if(await settings.isDisabled(message.guildId, 'commands', command.name)) {
                console.log(`${message.member.user.tag} executed disabled command [${command.name}] in ${message.guild.name}`);
                message.reply(`:no_entry: Command [**${command.name}**] disabled!`);
            }

            try {
                await command.execute(message, args)
                    .catch(err => {
                        console.log(`${message.member.user.tag} executed ^${command.name}. Couldn\'t execute that command!`, err);
                        message.reply('<:Error:849215023264169985> An unknown error occurred while executing this command!');
                    });
            } catch (err) {
                console.log(`${message.member.user.tag} executed ^${command.name}. Couldn\'t execute that command!`, err);
                await message.reply('<:Error:849215023264169985> An unknown error occurred while executing this command!');
            }
        }

    }
});

client.on('interactionCreate', async interaction => {
    if(!interaction.guildId) return interaction.reply(':warning: I can only be used in server channels!');

    if(interaction.isCommand()) {

        //Making interaction compatible with normal commands
        if(interaction.options.getUser('user')) {
            interaction.mentions = {
                users: new Discord.Collection().set(interaction.options.getUser('user').id, interaction.options.getUser('user'))
            }
        } else interaction.mentions = { users: new Discord.Collection() }
        interaction.attachments = [];

        const args = messages.getArgs(interaction);

        //Add own response handlers
        interaction.respond = (key, ...placeholders) => {
            return messages.reply(interaction, key, ...placeholders);
        }
        interaction.reply = (options) => {
            return messages.replyOptions(interaction, options);
        }

        if(interaction.commandName === 'message') await interaction.deferReply({ ephemeral: true });
        else await interaction.deferReply();

        interaction.respond(messages.keys.commands.executed);

        if (interaction.commandName === 'help') {
            await helpCommand.execute(interaction, args);
        } else {
            const command = client.commands.get(interaction.commandName);

            if (!command) return console.log(`${interaction.member.user.tag} executed non-existent command ${commandName} in ${interaction.guild.name}`);

            //Check if command disabled
            if(await settings.isDisabled(interaction.guildId, 'commands', command.name)) {
                console.log(`${interaction.member.user.tag} executed disabled slash command [${command.name}] in ${interaction.guild.name}`);
                interaction.reply(`:no_entry: Command [**${command.name}**] disabled!`);
                return;
            }

            try {
                command.execute(interaction, args);
            } catch (err) {
                console.log(`${interaction.member.user.tag} executed SlashCommand ${command.name}. Couldn't execute that command!`, err);
                interaction.reply('<:Error:849215023264169985> There was an error while executing this command!');
            }
        }

    } else if(interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if(!command) return;
        command.autocomplete(interaction);

    } else if (interaction.isButton()) {
        console.log(addPh(messages.keys.buttons.clicked.console, { "button_id": interaction.customId }, messages.ph.fromStd(interaction)));

        await interaction.deferReply({ ephemeral: true });
        if (interaction.customId.startsWith('disable')) {
            await disableButton.execute(interaction);
        } else if (interaction.customId.startsWith('enable')) {
            await enableButton.execute(interaction);
        }
    }
});

client.login(token);