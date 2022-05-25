const { keys } = require('../../api/messages');
const Discord = require("discord.js");
const utils = require("../../api/utils");
const plugin = require("../../api/plugin");

async function execute(message, args) {
    const user = message.mentions.users.first() ?? args[0];

    if (!message.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
        message.respond(keys.commands.op.warnings.no_permission);
        return;
    } else if(!user) {
        message.respond(keys.commands.op.warnings.no_username);
        return;
    }

    const mcUsername = user.id ? await utils.getUsername(user.id, message) : user;
    if(!mcUsername) return;

    const resp = await plugin.execute(`op ${mcUsername}`, message);
    if(!resp) return;

    if(resp.status === 206) message.respond(keys.commands.op.warnings.response_warning, { username: user, "response": resp.message });
    else message.respond(keys.commands.op.success, { username: user });
}

module.exports = { execute };

