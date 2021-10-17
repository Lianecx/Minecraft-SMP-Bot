const ftp = require('ftp');
const fs = require('fs');
const sftp = require('./sftp');
module.exports = {
	get: function (getPath, putPath, message) {
		return new Promise(async (resolve, reject) => {
			fs.readFile('./ftp/' + message.guild.id + '.json', async (err, ftpJson) => {
				if(err) {
					message.reply('<:Error:849215023264169985> Could not read ftp credentials. Please use `/ftp` first.');
					console.log('Error reading ftp file from disk: ', err);
					resolve();
				} else {
					// @ts-ignore
					const ftpData = JSON.parse(ftpJson);
					const host = ftpData.host;
					const user = ftpData.user;
					const pass = ftpData.password;
					const port = ftpData.port;
					const protocol = ftpData.protocol;

					if(protocol === 'sftp') { const sftpGet = await sftp.get(getPath, putPath, message); resolve(sftpGet); return; }

					const ftpClient = new ftp();
					ftpClient.on('error', function(err) {
						console.log('ftpError! ', err);
						message.reply('<:Error:849215023264169985> Could not connect to server.');
						resolve();
					});

					try {
						ftpClient.connect({
							host: host,
							port: port,
							user: user,
							password: pass,
							secureOptions: {
								rejectUnauthorized: false,
							},
						});
					} catch (err) {
						console.log('Could not connect to server. ', err);
						message.reply('<:Error:849215023264169985> Could not connect to server.');
						resolve();
					}

					ftpClient.on('ready', function() {
						ftpClient.get(getPath, (err, stream) => {
							if(err) {
								console.log('Could not download files. Path: ' + getPath, err);
								message.reply('<:Error:849215023264169985> ' + 'Could not download files. The User never joined the server or the worldpath is incorrect.');
								resolve();
							} else {
								stream.pipe(fs.createWriteStream(putPath));
								stream.once('close', function() {
									ftpClient.end();
									resolve(true);
									console.log('File [' + getPath + '] succesfully downloaded');
								});
							}
						});
					});
				}
			});
		});
	},

	put: function (getPath, putPath, message) {
		return new Promise(async (resolve, reject) => {
			fs.readFile('./ftp/' + message.guild.id + '.json', async (err, ftpJson) => {
				if(err) {
					message.reply('<:Error:849215023264169985> No ftp credentials found. Please use `/ftp` first.');
					console.log('Error reading ftp file from disk: ', err);
					resolve();
				} else {
					// @ts-ignore
					const ftpData = JSON.parse(ftpJson);
					const host = ftpData.host;
					const user = ftpData.user;
					const pass = ftpData.password;
					const port = ftpData.port;
					const protocol = ftpData.protocol;
	
					if(protocol === 'sftp') { const sftpPut = await sftp.put(getPath, putPath, message); resolve(sftpPut); return; }
					const ftpClient = new ftp();
					ftpClient.on('error', function(err) {
						console.log('ftpError! ', err);
						message.reply('<:Error:849215023264169985> Could not connect to server.');
						resolve();
					});

					try {
						ftpClient.connect({
							host: host,
							port: port,
							user: user,
							password: pass,
							secureOptions: {
								rejectUnauthorized: false,
							},
						});
					} catch (err) {
						console.log('Could not connect to server. ', err);
						message.reply('<:Error:849215023264169985> Could not connect to server.');
						resolve();
					}
	
					ftpClient.on('ready', function() {
						ftpClient.put(getPath, putPath, (err) => {
							if(err) {
								console.log('Could not put files. Path: ' + getPath, err);
								message.reply('<:Error:849215023264169985> Could not upload files.');
								resolve();
							} else {
								ftpClient.end();
								ftpClient.on('close', () => {
									console.log('File [' + putPath + '] succesfully uploaded.');
									resolve(true);
								});
							}
						});
					});
				}
			});
		});
	},

	connect: function(credentials) {
		return new Promise((resolve, reject) => {
			const ftpClient = new ftp();
			ftpClient.on('error', function(err) {
				console.log('Could not connect to server.', err);
				resolve();
			});
			try {
				ftpClient.connect({
					host: credentials.host,
					port: credentials.port,
					user: credentials.user,
					password: credentials.pass,
					secureOptions: {
						rejectUnauthorized: false,
					},
				});
				ftpClient.on('ready', function() {
					ftpClient.end();
					console.log('Connected with ftp.')
					resolve(true);
				});
			} catch (err) {
				console.log('Could not connect to server with ftp.', err);
				resolve();
			}
		})
	}
}