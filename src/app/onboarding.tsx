import {View, Text, Image, Pressable, StyleSheet, type PressableStateCallbackType} from "react-native";
import React, {useState, useEffect} from "react";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  withRepeat, 
} from "react-native-reanimated";
type props = {
    index2: number;
    onSkip: () => void;
}
export default function Onboarding({index2, onSkip}:props) {
    const saveScale = useSharedValue(1);
    const saveStyle = useAnimatedStyle(() => ({
        transform: [{ scale: saveScale.value }],
    }));
    useEffect(() =>{
        saveScale.value = withRepeat(withSequence(
            withTiming(0.95, { duration: 600 }),
            withSpring(1, { damping: 4, stiffness: 300 }),
        ),Infinity);
    }, [])
    function skipOnboarding() {
        onSkip();
    }
    const colors = useTheme()
    const [index, setIndex] = useState(0)
    const pages = [
        {
            title: "Start a new diary here!",
            description: "store all your important dates ♡",
            image: require("../../assets/images/onboarding.png"),
            text: "Skip All →"
        },
        {
            title: "Open your diary!",
            description: "view your calender!",
            image: require("../../assets/images/onboarding.png"),
            text: "Skip All →"
        },
        {
            title: "Make your first entry!",
            description: "click here to make an entry",
            image: require("../../assets/images/onboarding.png"),
            text: "Skip All →"
        },
        {
            title: "Click here to invite a collaborator!",
            description: "share notes together!",
            image: require("../../assets/images/onboarding.png"),
            text: "Skip All →"
        },
    ]
    useEffect(() => {
        if(index2>= 0 && index2 < pages.length){
            setIndex(index2)
        }
    }, [index2])
    const styles = StyleSheet.create({
    scrollContent: {
        width: 300,
        padding: spacing.lg,
        justifyContent: "center",
        backgroundColor: colors.colors.background, 
        alignItems: "center",
        borderRadius: radius.md,
        gap: 10,
        overflow: "visible"
    },
    title: {
        color: colors.colors.text,
        fontSize: fontSizes.md,
        fontFamily: fonts.heading,
        fontWeight: "700",
    },
    subtitle: {
        color: colors.colors.text,
        fontSize: fontSizes.xs,
        fontFamily: fonts.body,
        lineHeight: 20,
    },
    button: {
        backgroundColor: colors.colors.accent,
        color: colors.colors.text,
        paddingVertical: spacing.xs,
        borderRadius: radius.sm
    }, 
    image:{
        position: "relative", 
        alignSelf: "center", 
        justifyContent: "flex-start", 
        width: 50, 
        height: 50, 
    }
    });
    return(
            <Animated.View style = {[styles.scrollContent, saveStyle]}>
            <Image style = {styles.image} source = {pages[index].image}/>
            <Text style = {styles.title}> {pages[index].title} </Text>
            <Text style = {styles.subtitle}> {pages[index].description} </Text>
            <Pressable 
                style = {({pressed}:PressableStateCallbackType)=> [
                    styles.button,
                    {
                        backgroundColor: pressed? colors.colors.accentPressed:colors.colors.accent,
                    },
                    ]}
                onPress={skipOnboarding}>
                <Text style = {styles.subtitle}>
                    {pages[index].text}
                </Text>
            </Pressable>
        </Animated.View>
    );
}
