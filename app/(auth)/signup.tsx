import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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
import { errorHandler } from '../../services/errorHandler';
import { auth, db } from '../../services/firebase';
import { groupCodeService } from '../../services/groupCodeService';
import { validateEmail, validateGroupCodeFormat, validateName, validatePassword, validatePasswordMatch, validatePhoneNumber } from '../../services/validationService';

export default function SignUpScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors, theme);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [groupCode, setGroupCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignUp = async () => {
        // Validate name
        const nameValidation = validateName(name);
        if (!nameValidation.isValid) {
            setError(nameValidation.error || t('auth.invalidName'));
            return;
        }

        // Validate email
        const emailValidation = validateEmail(email);
        if (!emailValidation.isValid) {
            setError(emailValidation.error || t('auth.invalidEmail'));
            return;
        }

        // Validate phone number
        const phoneValidation = validatePhoneNumber(phoneNumber);
        if (!phoneValidation.isValid) {
            setError(phoneValidation.error || t('auth.invalidPhone'));
            return;
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            setError(passwordValidation.error || t('auth.invalidPassword'));
            return;
        }

        // Validate password match
        const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
        if (!passwordMatchValidation.isValid) {
            setError(passwordMatchValidation.error || t('auth.passwordsDontMatch'));
            return;
        }

        // Validate group code format
        const groupCodeValidation = validateGroupCodeFormat(groupCode);
        if (!groupCodeValidation.isValid) {
            setError(groupCodeValidation.error || t('auth.invalidGroupCode'));
            return;
        }

        setLoading(true);
        setError('');
        try {
            // 1. Validate group code against Firebase
            const codeValidation = await groupCodeService.validateGroupCode(groupCode);
            if (!codeValidation.isValid) {
                setError(codeValidation.error || t('auth.invalidGroupCode'));
                setLoading(false);
                return;
            }

            // 2. Create user in Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const user = userCredential.user;

            // 3. Update profile with name
            await updateProfile(user, { displayName: name.trim() });

            // 4. Generate Member ID (SBK###)
            let memberId = '';
            try {
                const { getNextMemberId } = await import('../../services/memberIdService');
                memberId = await getNextMemberId();
            } catch (idError) {
                console.error('Error generating ID during signup:', idError);
                // Fallback: ID will be assigned by admin if this fails
            }

            // 5. Create user record in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                displayName: name.trim(),
                email: email.trim().toLowerCase(),
                phoneNumber: phoneNumber.trim(),
                groupCode: groupCode.trim().toUpperCase(),
                role: 'Member',
                status: 'Active',
                memberId: memberId || null,
                createdAt: new Date().toISOString()
            });

            // 6. Send Email Verification
            await sendEmailVerification(user);

            // 7. Alert and Redirect
            const successMessage = t('auth.accountCreated') || 'Account created successfully! Please check your email.';
            const successTitle = t('common.success') || 'Success';

            const handleSuccess = async () => {
                try {
                    await auth.signOut();
                    router.replace('/(auth)/login');
                } catch (e) {
                    console.error("Sign out error:", e);
                    // Force redirect even if signOut fails
                    router.replace('/(auth)/login');
                }
            };

            if (Platform.OS === 'web') {
                window.alert(successMessage);
                await handleSuccess();
            } else {
                Alert.alert(
                    successTitle,
                    successMessage,
                    [{ text: t('common.ok') || 'OK', onPress: handleSuccess }]
                );
            }
        } catch (error: any) {
            console.error(error);
            const { userMessage } = errorHandler.handle(error);
            setError(t(userMessage));
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
                            <TouchableOpacity onPress={() => router.back()} style={styles.backButton as ViewStyle}>
                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.title as TextStyle}>{t('common.signup')}</Text>
                            <Text style={styles.subtitle as TextStyle}>{t('auth.createAccountSubtitle')}</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form as ViewStyle}>
                            <View style={styles.inputGroup as ViewStyle}>
                                <Text style={styles.label as TextStyle}>{t('common.name')}</Text>
                                <View style={styles.inputContainer as ViewStyle}>
                                    <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input as TextStyle}
                                        placeholder={t('common.fullName')}
                                        placeholderTextColor={colors.textSecondary}
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>
                            </View>

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
                                <Text style={styles.label as TextStyle}>{t('common.phone')}</Text>
                                <View style={styles.inputContainer as ViewStyle}>
                                    <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input as TextStyle}
                                        placeholder="07XX XXX XXX"
                                        placeholderTextColor={colors.textSecondary}
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup as ViewStyle}>
                                <Text style={styles.label as TextStyle}>{t('common.groupCode')}</Text>
                                <View style={styles.inputContainer as ViewStyle}>
                                    <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input as TextStyle}
                                        placeholder={t('common.groupCode')}
                                        placeholderTextColor={colors.textSecondary}
                                        value={groupCode}
                                        onChangeText={setGroupCode}
                                        autoCapitalize="characters"
                                    />
                                </View>
                                <Text style={styles.helperText as TextStyle}>{t('auth.groupCodeHint')}</Text>
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

                            <View style={styles.inputGroup as ViewStyle}>
                                <Text style={styles.label as TextStyle}>{t('auth.confirmPassword')}</Text>
                                <View style={styles.inputContainer as ViewStyle}>
                                    <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                                    <TextInput
                                        style={styles.input as TextStyle}
                                        placeholder="••••••••"
                                        placeholderTextColor={colors.textSecondary}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons
                                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                            size={20}
                                            color={colors.textSecondary}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {error ? (
                                <View style={styles.errorContainer as ViewStyle}>
                                    <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
                                    <Text style={styles.errorText as TextStyle}>{error}</Text>
                                </View>
                            ) : null}

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleSignUp}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.buttonText as TextStyle}>{t('common.signup')}</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.footer as ViewStyle}>
                                <Text style={styles.footerText as TextStyle}>{t('auth.alreadyHaveAccount')}</Text>
                                <TouchableOpacity onPress={() => router.back()}>
                                    <Text style={styles.loginText as TextStyle}>{t('common.login')}</Text>
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
        paddingTop: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 32,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -1,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 24,
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
    helperText: {
        fontSize: 12,
        color: colors.textSecondary,
        marginLeft: 4,
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
    loginText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '900',
    },
});
