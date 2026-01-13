import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
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
        try {
            await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            router.replace('/(tabs)');
        } catch (error) {
            const err = error as any;
            // Provide user-friendly error messages
            if (err.code === 'auth/user-not-found') {
                setError(t('auth.invalidEmail'));
            } else if (err.code === 'auth/wrong-password') {
                setError(t('common.password') + ' ' + t('common.error'));
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('common.error'));
            } else if (err.code === 'auth/invalid-email') {
                setError(t('auth.invalidEmail'));
            } else {
                setError(err.message || t('common.error'));
            }
            console.error(err);
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
        paddingHorizontal: 30,
        paddingTop: 50,
        paddingBottom: 30,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 120,
        height: 120,
        borderRadius: 30,
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    form: {
        gap: 20,
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
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
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
