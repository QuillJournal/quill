import {View, Text, Image, Pressable, StyleSheet, type PressableStateCallbackType} from "react-native";
import React, {useState, useEffect} from "react";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
import { supabase } from "@/src/utils/supabase";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  withRepeat, 
} from "react-native-reanimated";
type props = {
    position?:[number, number]; 
    index2: number;
    userid: string; 
}
export default function Onboarding({position = [100,50], index2, userid}:props) { // top n left
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
    async function onboardingCompleted() {
        setVisible(false)
        const { error} = await supabase.from("profiles").update({onboarding: true}).eq("id", userid)
        if(error){
            console.error("Onboarding Status Change Error"+ error.message)
            return;
        }
    }
    const colors = useTheme()
    const [index, setIndex] = useState(0)
    const [visible, setVisible] = useState(true); 
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
            text: "Finish!"
        },
    ]
    useEffect(() => {
        if(index2>= 0 && index2 < pages.length){
            setIndex(index2)
        }else{
            onboardingCompleted()
        }
    }, [index2])
    const styles = StyleSheet.create({
    scrollContent: {
        zIndex: 10, 
        elevation: 10, 
        width: 300,
        height: 100,
        position: "absolute", 
        left: position[0],
        top: position[1],
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        justifyContent: "center",
        backgroundColor: colors.colors.background, 
        alignItems: "center",
        marginVertical: spacing.xl,
    },
    title: {
        color: colors.colors.text,
        fontSize: fontSizes.xl,
        fontFamily: fonts.heading,
        fontWeight: "700",
        marginBottom: spacing.xs,
    },
    subtitle: {
        color: colors.colors.textMuted,
        fontSize: fontSizes.sm,
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
        visible && 
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
                onPress = {() => onboardingCompleted()}> 
                <Text style = {styles.subtitle}>
                    {pages[index].text}
                </Text>
            </Pressable>
        </Animated.View>
        
    );
}
