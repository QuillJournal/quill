import {View, Text, Image, Pressable, StyleSheet, type PressableStateCallbackType} from "react-native";
import React, {useState, useEffect} from "react";
import { radius } from "@/src/constants/radius";
import { spacing } from "@/src/constants/spacings";
import { fonts, fontSizes } from "@/src/constants/typography";
import useTheme from "@/src/hooks/useTheme";
type props = {
    position?:[number, number]; 
    check:boolean;
}
export default function Onboarding({position = [100,50], check}:props) { // top n left
    const colors = useTheme()
    const [index, setIndex] = useState(0)
    const [visible, setVisible] = useState(true); 
    const pages = [
        {
            title: "Start a new diary here!",
            description: "store all your important dates♡",
            button: "Skip :(",
            image: require("../../assets/images/icon.png")
        },
        {
            title: "Make your first entry!",
            description: "inpsiring.",
            button: "Next →",
            image: require("../../assets/images/icon.png")
        },
        {
            title: "done!",
            description: "inpsiring.",
            button: "ok!",
            image: require("../../assets/images/icon.png")
        },
    ]
    function change_page(){ 
        if (index === 0 ){
            //SPECIAL CASE SKIP 
            setVisible(false);
            return
        }
        if(index < pages.length -1){
            setIndex(index+1);
        }else{
            setVisible(false);
        }
    }
    const styles = StyleSheet.create({
    scrollContent: {
        zIndex: 10, 
        elevation: 10, 
        width: 200,
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
            <View style = {styles.scrollContent}>
            <Image style = {styles.image} source = {pages[index].image}/>
            <Text style = {styles.title}> {pages[index].title} </Text>
            <Text style = {styles.subtitle}> {pages[index].description} </Text>
            <Pressable 
                style = {({pressed}:PressableStateCallbackType)=> [
                    styles.button,
                    {
                        backgroundColor: pressed? colors.colors.accentPressed:colors.colors.accent,
                        opacity: check? 1: 0.5
                    },
                    ]}
                disabled = {!check}
                onPress = {change_page}> 
                <Text style = {styles.subtitle}>
                    {pages[index].button} 
                </Text>
            </Pressable>
        </View>
        
    );
}
