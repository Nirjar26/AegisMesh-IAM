const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const prisma = require('./database');
const logger = require('../utils/logger');
const { handleOAuthLogin } = require('../services/auth/oauth.service');

function initializePassport() {
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await prisma.user.findUnique({ where: { id } });
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });

    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        passport.use(
            new GoogleStrategy(
                {
                    clientID: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: process.env.GOOGLE_CALLBACK_URL,
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const result = await handleOAuthLogin('google', profile, accessToken);
                        done(null, result);
                    } catch (error) {
                        done(error, null);
                    }
                }
            )
        );
        logger.info('Google OAuth strategy initialized');
    } else {
        logger.warn('Google OAuth not configured (missing client ID/secret)');
    }

    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        passport.use(
            new GitHubStrategy(
                {
                    clientID: process.env.GITHUB_CLIENT_ID,
                    clientSecret: process.env.GITHUB_CLIENT_SECRET,
                    callbackURL: process.env.GITHUB_CALLBACK_URL,
                    scope: ['user:email'],
                },
                async (accessToken, refreshToken, profile, done) => {
                    try {
                        const result = await handleOAuthLogin('github', profile, accessToken);
                        done(null, result);
                    } catch (error) {
                        done(error, null);
                    }
                }
            )
        );
        logger.info('GitHub OAuth strategy initialized');
    } else {
        logger.warn('GitHub OAuth not configured (missing client ID/secret)');
    }
}

module.exports = { initializePassport };
