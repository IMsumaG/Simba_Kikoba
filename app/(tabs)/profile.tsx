import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import i18n from '../../i18n';
import { useAuth } from '../../services/AuthContext';
import { auth } from '../../services/firebase';
import type { MenuItemProps } from '../../types';

export default function ProfileScreen() {
    const { user, userProfile, role } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const { theme, toggleTheme, colors } = useTheme();
    const styles = createStyles(colors, theme);

    const handleLogout = () => {
        auth.signOut();
    };

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'sw' : 'en';
        i18n.changeLanguage(nextLang);
    };

    const MenuItem: React.FC<MenuItemProps> = ({ icon, title, value, onPress, color = colors.textSecondary, isLast = false }) => (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.menuItem, !isLast && styles.menuItemBorder]}
        >
            <View style={[styles.menuIconContainer, { backgroundColor: colors.backgroundMuted }]}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{title}</Text>
                {value && <Text style={styles.menuValue}>{value}</Text>}
            </View>
            <View style={[styles.menuChevron, { backgroundColor: colors.backgroundMuted }]}>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
            <ScrollView
                style={styles.flex1 as ViewStyle}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent as ViewStyle}
            >
                <View style={styles.profileHeader as ViewStyle}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { borderColor: userProfile?.memberId ? colors.primary : colors.card }]}>
                            <Text style={styles.avatarText}>{user?.displayName?.[0] || 'U'}</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{role || t('common.member')}</Text>
                    </View>
                    {userProfile?.memberId && (
                        <View style={styles.memberIdBadge}>
                            <Text style={styles.memberIdText}>ID: {userProfile.memberId}</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon="color-palette"
                        title="Appearance"
                        value={theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        onPress={toggleTheme}
                        color={colors.primary}
                    />
                    <MenuItem
                        icon="language"
                        title={t('settings.language')}
                        value={i18n.language === 'en' ? t('settings.english') : t('settings.swahili')}
                        onPress={toggleLanguage}
                        color={colors.warning}
                    />
                    <MenuItem
                        icon="notifications"
                        title={t('settings.notifications')}
                        value={t('common.success')}
                        color={colors.info}
                    />
                    <MenuItem
                        icon="shield-checkmark"
                        title={t('settings.privacy')}
                        color={colors.success}
                        isLast
                    />
                </View>

                {/* Admin Tools - Migration */}
                {role === 'Admin' && (
                    <>
                        <Text style={styles.sectionTitle}>ADMIN TOOLS</Text>
                        <View style={styles.menuGroup}>
                            <MenuItem
                                icon="shield-half"
                                title="System Audit Logs"
                                color={colors.warning}
                                onPress={() => router.push('/admin/audit-logs' as any)}
                                isLast
                            />
                        </View>
                    </>
                )}

                <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon="log-out"
                        title={t('common.logout')}
                        color={colors.danger}
                        onPress={handleLogout}
                        isLast
                    />
                </View>

                <TouchableOpacity style={styles.footer as ViewStyle}>
                    <Text style={styles.versionText}>KIKOBA Insights {t('settings.version')} 1.0.0</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView >
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 110,
        height: 110,
        borderRadius: 40,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: colors.card,
        elevation: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    avatarText: {
        color: 'white',
        fontSize: 40,
        fontWeight: '900',
    },
    userName: {
        color: colors.text,
        fontSize: 24,
        fontWeight: '900',
        marginTop: 24,
        letterSpacing: -0.5,
    },
    roleBadge: {
        backgroundColor: colors.card,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 99,
        marginTop: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    roleText: {
        color: colors.primary,
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    memberIdBadge: {
        backgroundColor: colors.primaryBackground,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 99,
        marginTop: 6,
        borderWidth: 1,
        borderColor: colors.primaryBorder,
    },
    memberIdText: {
        color: colors.primary,
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1.5,
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 4,
    },
    menuGroup: {
        backgroundColor: colors.card,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 32,
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: colors.backgroundMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuValue: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    menuChevron: {
        backgroundColor: colors.backgroundMuted,
        padding: 8,
        borderRadius: 12,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    versionText: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        opacity: 0.5,
    },
});
