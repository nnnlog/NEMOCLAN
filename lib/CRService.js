const fs = require("fs");
const util = require("util");
const scheduler = require("node-schedule");
const promise = require("promise");
const request = require("request");
const SitemapGenerator = require('sitemap-generator');

const existsFile = async function (path) {
    try {
        await util.promisify(fs.access)(path);
    } catch (e) {
        return false;
    }
    return true;
};

const dataFiles = {
	info: __app + '/data/info.json',
	war: __app + '/data/war.json',
	warlog: __app + '/data/warlog.json',

	lastWeekRecord: __app + '/data/weekly_record.json'
};

class CRService {

	constructor(code, clan_tag) {
		this.code = code;
		this.clan_tag = clan_tag;

		this.info = [];
		this.war = [];
		this.warlog = [];
	}

	getOpts(url, extraHeaders = {}) {
		return {
			url: url,
			method: 'GET',
			headers: Object.assign({
				auth: this.code
			}, extraHeaders)
		}
	}

	checkAuthorizationCode() {
		return new Promise(resolve => {
			request(this.getOpts('https://api.royaleapi.com/version'), (err, res, body) => {
				console.log(body);
				if (err) {
					resolve(false);
					return;
				}
				if (res && res.statusCode === 200) {
					resolve(body);
					return;
				}

				resolve(false);
			});
		});
	}

	getClanInfo() {
		return new Promise(resolve => {
			request(this.getOpts('https://api.royaleapi.com/clan/' + this.clan_tag), (err, res, body) => {
				if (err) {
					resolve(false);
					return;
				}

				if (res && res.statusCode === 200) {
					let json = JSON.parse(body);
					if (json['tag'] === this.clan_tag) {
						resolve(json);
						return;
					}
				}

				resolve(false);
			});
		});
	}

	getClanWar() {
		return new Promise(resolve => {
			request(this.getOpts('https://api.royaleapi.com/clan/' + this.clan_tag + '/war'), (err, res, body) => {
				if (err) {
					console.log(err);
					resolve(false);
					return;
				}

				if (res && res.statusCode === 200) {
					let json = JSON.parse(body);
					if (json.hasOwnProperty('state')) {
						resolve(json);
						return;
					}
				}

				resolve(false);
			});
		});
	}

	getClanWarLog() {
		return new Promise(resolve => {
			request(this.getOpts('https://api.royaleapi.com/clan/' + this.clan_tag + '/warlog'), (err, res, body) => {
				if (err) {
					resolve(false);
					return;
				}

				if (res && res.statusCode === 200) {
					let json = JSON.parse(body);
					resolve(json);
					return;
				}

				resolve(false);
			});
		});
	}

	init() {
		return new Promise(async(resolve) => {
			if (!await existsFile(__app + "/data/")) {
				await util.promisify(fs.mkdir)(__app + '/data/');
			}
			if (await existsFile(dataFiles.info)) {
				try {
					this.info = JSON.parse(await util.promisify(fs.readFile)(dataFiles.info));
				} catch (e) {
					this.info = [];
				}
			}
			if (await existsFile(dataFiles.war)) {
				try {
					this.war = JSON.parse(await util.promisify(fs.readFile)(dataFiles.war));
				} catch (e) {
					this.war = [];
				}
			}
			if (await existsFile(dataFiles.warlog)) {
				try {
					this.warlog = JSON.parse(await util.promisify(fs.readFile)(dataFiles.warlog));
				} catch (e) {
					this.warlog = [];
				}
			}
			resolve();
		});
	}

	start() {
		var that = this;
		this.run();
		
		scheduler.scheduleJob("* * * * *", () => {
			that.run();
		});
	}

	async run() {
		console.log((new Date()).toLocaleString() + " > 정보 수집 시작..");
			await this.getClanInfo().then(async(data) => {
				if (!data) {
					console.log((new Date()).toLocaleString() + " > 클랜 정보 수집 실패");
				} else {
					if (this.info.hasOwnProperty('donations')) {
						if (this.info['donations'] > data['donations']) {
							console.log((new Date()).toLocaleString() + " > 주간 기록 갱신");
							await util.promisify(fs.writeFile)(dataFiles.lastWeekRecord, JSON.stringify(this.info, null, 4));
						}
					}
					this.info = data;
					await util.promisify(fs.writeFile)(dataFiles.info, JSON.stringify(this.info, null, 4));
				}
			});

			await this.getClanWar().then(async(data) => {
				if (!data) {
					console.log((new Date()).toLocaleString() + " > 클랜전 정보 수집 실패");
				} else {
					this.war = data;
					await util.promisify(fs.writeFile)(dataFiles.war, JSON.stringify(this.war, null, 4));
				}
			});

			await this.getClanWarLog().then(async(data) => {
				if (!data) {
					console.log((new Date()).toLocaleString() + " > 클랜전 기록 정보 수집 실패");
				} else {
					let wars = [];
					for (let war of this.warlog) {
						wars[war['createdDate']] = war;
					}

					for (let war of data) {
						wars[war['createdDate']] = war;
					}

					wars = wars.sort((a, b) => {
						return b['createdDate'] - a['createdDate'];
					});

					this.warlog = Object.values(wars);
					await util.promisify(fs.writeFile)(dataFiles.warlog, JSON.stringify(this.warlog, null, 4));
				}
			});

			console.log((new Date()).toLocaleString() + " > 정보 수집 완료");

			console.log((new Date()).toLocaleString() + " > 사이트맵 생성...");
			let generator = SitemapGenerator('https://nemoclan.ml/', {
				stripQuerystring: false,
				filepath: __app + '/public/sitemap.xml',
			});

			generator.start();

			console.log((new Date()).toLocaleString() + " > 사이트맵 생성 완료");
	}

}

module.exports = CRService;