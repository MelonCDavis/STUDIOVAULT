export const ROLES = {
    OWNER: "OWNER",
    MANAGER: "MANAGER",
    ARTIST: "ARTIST",
    FRONT_DESK: "FRONT_DESK",
};

const ROLE_HIERARCHY = [
    ROLES.OWNER,
    ROLES.MANAGER,
    ROLES.ARTIST,
    ROLES.FRONT_DESK,
];

function roleAtLeast(role, minimumRole) {
    return (
        ROLE_HIERARCHY.indexOf(role) <= 
        ROLE_HIERARCHY.indexOf(minimumRole)
    );
}

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    roleAtLeast,
};