import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n from '../../i18n';
import { useAuth } from '../../services/AuthContext';
import { auth } from '../../services/firebase';
import type { MenuItemProps } from '../../types';

export default function ProfileScreen() {
    const { user, role } = useAuth();
    const { t } = useTranslation();

    const handleLogout = () => {
        auth.signOut();
    };

    const toggleLanguage = () => {
        const nextLang = i18n.language === 'en' ? 'sw' : 'en';
        i18n.changeLanguage(nextLang);
    };

    const MenuItem: React.FC<MenuItemProps> = ({ icon, title, value, onPress, color = '#64748B', isLast = false }) => (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.menuItem, !isLast && styles.menuItemBorder]}
        >
            <View style={styles.menuIconContainer}>
                <Ionicons name={icon as any} size={22} color={color} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>{title}</Text>
                {value && <Text style={styles.menuValue}>{value}</Text>}
            </View>
            <View style={styles.menuChevron}>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                style={styles.flex1 as ViewStyle}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent as ViewStyle}
            >
                <View style={styles.profileHeader as ViewStyle}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{user?.displayName?.[0] || 'U'}</Text>
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{role || t('common.member')}</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>{t('settings.general')}</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon="language"
                        title={t('settings.language')}
                        value={i18n.language === 'en' ? t('settings.english') : t('settings.swahili')}
                        onPress={toggleLanguage}
                        color="#F57C00"
                    />
                    <MenuItem
                        icon="notifications"
                        title={t('settings.notifications')}
                        value={t('common.success')}
                        color="#3B82F6"
                    />
                    <MenuItem
                        icon="shield-checkmark"
                        title={t('settings.privacy')}
                        color="#10B981"
                        isLast
                    />
                </View>

                <Text style={styles.sectionTitle}>{t('settings.account')}</Text>
                <View style={styles.menuGroup}>
                    <MenuItem
                        icon="log-out"
                        title={t('common.logout')}
                        color="#F43F5E"
                        onPress={handleLogout}
                        isLast
                    />
                </View>

                <TouchableOpacity style={styles.footer as ViewStyle}>
                    <Text style={styles.versionText}>KIKOBA Insights {t('settings.version')} 1.0.0</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
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
        backgroundColor: '#EA580C',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFF7ED',
        elevation: 10,
        shadowColor: '#EA580C',
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
        color: '#0F172A',
        fontSize: 24,
        fontWeight: '900',
        marginTop: 24,
        letterSpacing: -0.5,
    },
    roleBadge: {
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 99,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FFEDD5',
    },
    roleText: {
        color: '#EA580C',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    sectionTitle: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 4,
    },
    menuGroup: {
        backgroundColor: 'white',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        padding: 16,
        marginBottom: 32,
        elevation: 2,
        shadowColor: '#000',
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
        borderBottomColor: '#F8FAFC',
    },
    menuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        color: '#0F172A',
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuValue: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    menuChevron: {
        backgroundColor: '#F8FAFC',
        padding: 8,
        borderRadius: 12,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    versionText: {
        color: '#CBD5E1',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
});
