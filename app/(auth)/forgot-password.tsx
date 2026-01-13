import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { auth } from '../../services/firebase';
import { validateEmail } from '../../services/validationService';

export default function ForgotPasswordScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors, theme);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async () => {
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            Alert.alert('Invalid Email', emailValidation.error || 'Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim().toLowerCase());
            setSuccess(true);
        } catch (error: any) {
            console.error('Password reset error:', error);
            let message = 'Failed to send reset email. Please try again.';
            if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email address.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address.';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Too many requests. Please try again later.';
            }
            Alert.alert('Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container as ViewStyle}
        >
            <SafeAreaView style={styles.container as ViewStyle}>
                <ScrollView contentContainerStyle={styles.scrollContent as ViewStyle} keyboardShouldPersistTaps="handled">
                    <View style={styles.content as ViewStyle}>
                        {/* Header */}
                        <View style={styles.header as ViewStyle}>
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton as ViewStyle}
                            >
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.title as TextStyle}>{t('auth.resetPassword')}</Text>
                            <Text style={styles.subtitle as TextStyle}>
                                {success
                                    ? t('auth.checkInbox')
                                    : t('auth.groupCodeHint')}
                            </Text>
                        </View>

                        {success ? (
                            <View style={styles.successContainer as ViewStyle}>
                                <View style={styles.successIcon as ViewStyle}>
                                    <Ionicons name="mail-unread-outline" size={60} color={colors.primary} />
                                </View>
                                <Text style={styles.successText as TextStyle}>
                                    {t('auth.resetLinkSent')}
                                </Text>
                                <Text style={styles.emailText as TextStyle}>{email.trim().toLowerCase()}</Text>
                                <Text style={styles.infoText as TextStyle}>
                                    {t('auth.spamFolderHint')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.replace('/login')}
                                    style={styles.button as ViewStyle}
                                >
                                    <Text style={styles.buttonText as TextStyle}>{t('auth.backToLogin')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setSuccess(false)}
                                    style={styles.resendButton as ViewStyle}
                                >
                                    <Text style={styles.resendText as TextStyle}>{t('auth.tryAnotherEmail')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.form as ViewStyle}>
                                <View style={styles.inputGroup as ViewStyle}>
                                    <Text style={styles.label as TextStyle}>{t('common.email')}</Text>
                                    <View style={styles.inputContainer as ViewStyle}>
                                        <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                                        <TextInput
                                            style={styles.input as TextStyle}
                                            placeholder="name@example.com"
                                            placeholderTextColor={colors.textSecondary}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                    style={styles.button as ViewStyle}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <View style={styles.buttonContent as ViewStyle}>
                                            <Text style={styles.buttonText as TextStyle}>{t('auth.sendResetLink')}</Text>
                                            <Ionicons name="paper-plane-outline" size={20} color="white" />
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <View style={styles.footer as ViewStyle}>
                                    <Text style={styles.footerText as TextStyle}>{t('auth.alreadyHaveAccount')} </Text>
                                    <TouchableOpacity onPress={() => router.back()}>
                                        <Text style={styles.linkText as TextStyle}>{t('common.login')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
        paddingVertical: 48,
    },
    header: {
        marginTop: 20,
        marginBottom: 40,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        color: colors.text,
        fontSize: 30,
        fontWeight: 'bold',
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 16,
        marginTop: 8,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        color: colors.textSecondary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: colors.text,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        height: 56,
        marginTop: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 18,
    },
    successContainer: {
        alignItems: 'center',
        paddingTop: 20,
    },
    successIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.primaryBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    successText: {
        fontSize: 18,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 8,
        marginBottom: 24,
    },
    infoText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 20,
        marginBottom: 32,
    },
    resendButton: {
        marginTop: 24,
        padding: 8,
    },
    resendText: {
        color: colors.textSecondary,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    linkText: {
        color: colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
});
