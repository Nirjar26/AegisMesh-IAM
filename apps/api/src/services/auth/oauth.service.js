const prisma = require('../../config/database');

async function handleOAuthLogin(provider, profile, accessToken) {
    const providerId = profile.id;
    const email = profile.emails?.[0]?.value || `${provider}_${providerId}@oauth.local`;
    const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || provider;
    const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || 'User';

    let oauthAccount = await prisma.oAuthAccount.findUnique({
        where: {
            provider_providerId: { provider, providerId },
        },
        include: { user: true },
    });

    if (oauthAccount) {
        if (oauthAccount.user.status !== 'ACTIVE') {
            throw new Error(`AUTH_008: Account is ${oauthAccount.user.status.toLowerCase()}`);
        }
        await prisma.oAuthAccount.update({
            where: { id: oauthAccount.id },
            data: { accessToken },
        });
        return oauthAccount.user;
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
        if (user.status !== 'ACTIVE') {
            throw new Error(`AUTH_008: Account is ${user.status.toLowerCase()}`);
        }
        await prisma.oAuthAccount.create({
            data: {
                userId: user.id,
                provider,
                providerId,
                accessToken,
            },
        });
    } else {
        user = await prisma.user.create({
            data: {
                email,
                firstName,
                lastName,
                emailVerified: true,
                oauthAccounts: {
                    create: {
                        provider,
                        providerId,
                        accessToken,
                    },
                },
            },
        });
    }

    return user;
}

module.exports = { handleOAuthLogin };
