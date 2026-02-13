import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendEmailVerification, signInWithEmailAndPassword, User } from 'firebase/auth';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { errorHandler } from '../../services/errorHandler';
import { auth } from '../../services/firebase';
import { validateEmail, validatePassword } from '../../services/validationService';

export default function LoginScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors, theme);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Verification state
    const [verificationNeeded, setVerificationNeeded] = useState(false);
    const [userToVerify, setUserToVerify] = useState<User | null>(null);
    const [verificationSent, setVerificationSent] = useState(false);

    const handleLogin = async () => {
        // Validate inputs
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            setError(emailValidation.error || 'Invalid email');
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.error || 'Invalid password');
            return;
        }

        setLoading(true);
        setError('');
        setVerificationNeeded(false);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

            if (!userCredential.user.emailVerified) {
                // Do not sign out immediately. Keep user for sending verification email.
                setUserToVerify(userCredential.user);
                setVerificationNeeded(true);
                setLoading(false);
                return;
            }

            router.replace('/(tabs)');
        } catch (error: any) {
            console.error(error);
            const { userMessage } = errorHandler.handle(error);
            setError(t(userMessage));
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!userToVerify) return;
        setLoading(true);
        try {
            await sendEmailVerification(userToVerify);
            setVerificationSent(true);
            Alert.alert(t('common.success'), t('auth.verificationSentMessage'));
            setError('');
        } catch (e) {
            console.error(e);
            Alert.alert(t('common.error'), t('auth.verificationError'));
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = async () => {
        await auth.signOut();
        setVerificationNeeded(false);
        setUserToVerify(null);
        setVerificationSent(false);
        setError('');
    };

    if (verificationNeeded) {
        return (
            <SafeAreaView style={[styles.container as ViewStyle, { justifyContent: 'center', padding: 24 }]}>
                <View style={[styles.content as ViewStyle, { alignItems: 'center' }]}>
                    <View style={[styles.logo, { backgroundColor: colors.card, marginBottom: 32 }]}>
                        <Image
                            source={require('../../assets/images/sbk-logo.png')}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={[styles.title as TextStyle, { marginBottom: 16 }]}>
                        {t('auth.verificationRequired')}
                    </Text>

                    <Text style={[styles.subtitle as TextStyle, { marginBottom: 32, textAlign: 'center' }]}>
                        {verificationSent
                            ? t('auth.verificationSentMessage')
                            : t('auth.verifyEmailMessage')}
                    </Text>

                    {!verificationSent && (
                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled, { width: '100%', marginBottom: 16 }]}
                            onPress={handleResendVerification}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText as TextStyle}>
                                    {t('auth.resendVerification')}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, width: '100%' }]}
                        onPress={handleBackToLogin}
                    >
                        <Text style={[styles.buttonText as TextStyle, { color: colors.text }]}>
                            {t('auth.backToLogin')}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container as ViewStyle}
        >
            <SafeAreaView style={styles.container as ViewStyle}>
                <ScrollView contentContainerStyle={styles.scrollContent as ViewStyle} keyboardShouldPersistTaps="handled">
                    <View style={styles.content as ViewStyle}>
                        {/* Logo & Header */}
                        <View style={styles.header as ViewStyle}>
                            <View style={[styles.logo, { backgroundColor: 'transparent' }]}>
                                <Image
                                    source={require('../../assets/images/sbk-logo.png')}
                                    style={{ width: '100%', height: '100%' }}
                                    resizeMode="contain"
                                />
                            </View>
                            <Text style={styles.title as TextStyle}>Simba Bingwa Kikoba Endelevu</Text>
                            <Text style={styles.subtitle as TextStyle}>{t('common.login')}</Text>
                        </View>

                        {/* Form */}
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

                            <View style={styles.inputGroup as ViewStyle}>
                                <Text style={styles.label as TextStyle}>{t('common.password')}</Text>
                                <View style={styles.inputContainer as ViewStyle}>
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input as TextStyle}
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.textSecondary}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons
                                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/forgot-password')}
                                style={styles.forgotPassword as ViewStyle}
                            >
                                <Text style={styles.forgotPasswordText as TextStyle}>{t('auth.forgotPassword')}</Text>
                            </TouchableOpacity>

                            {error ? (
                                <View style={styles.errorContainer as ViewStyle}>
                                    <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                                    <Text style={styles.errorText as TextStyle}>{error}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleLogin}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.buttonText as TextStyle}>{t('common.login')}</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.footer as ViewStyle}>
                                <Text style={styles.footerText as TextStyle}>{t('auth.noAccount')}</Text>
                                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                                    <Text style={styles.signupText as TextStyle}>{t('common.signup')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 24,
        borderRadius: 24,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        gap: 20,
        width: '100%',
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: colors.border,
    },
    input: {
        flex: 1,
        paddingHorizontal: 12,
        fontSize: 16,
        color: colors.text,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: -8,
        marginBottom: 8,
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.dangerBackground,
        padding: 12,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.dangerBorder,
    },
    errorText: {
        color: colors.danger,
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        elevation: 4,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        gap: 8,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    signupText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '900',
    },
});


