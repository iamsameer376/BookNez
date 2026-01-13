import * as React from "react"
import Autoplay from "embla-carousel-autoplay"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"

const HERO_SLIDES = [
    {
        id: 1,
        title: "Weekend Cricket Bash",
        subtitle: "Book top-rated turfs near you",
        image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067&auto=format&fit=crop",
        cta: "Book Now",
        link: "/venues?category=turf",
        color: "from-green-600/90 to-emerald-900/40"
    },
    {
        id: 2,
        title: "Badminton Pro Courts",
        subtitle: "Premium wooden courts available",
        image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop",
        cta: "Explore",
        link: "/venues?category=badminton",
        color: "from-blue-600/90 to-indigo-900/40"
    },
    {
        id: 3,
        title: "Swimming Sessions",
        subtitle: "Beat the heat this summer",
        image: "https://images.unsplash.com/photo-1600965962102-9d260a71890d?q=80&w=2070&auto=format&fit=crop",
        cta: "View Pools",
        link: "/venues?category=swimming",
        color: "from-cyan-600/90 to-blue-900/40"
    }
]

export function HeroCarousel() {
    const navigate = useNavigate()

    const plugin = React.useRef(
        Autoplay({ delay: 5000, stopOnInteraction: true })
    )

    return (
        <div className="w-full relative group">
            <Carousel
                plugins={[plugin.current]}
                className="w-full"
                opts={{
                    align: "start",
                    loop: true,
                }}
            >
                <CarouselContent>
                    {HERO_SLIDES.map((slide) => (
                        <CarouselItem key={slide.id}>
                            <div className="relative aspect-[21/9] md:aspect-[3/1] w-full overflow-hidden rounded-xl md:rounded-2xl">
                                {/* Background Image */}
                                <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                />

                                {/* Gradient Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-r ${slide.color} via-black/20 to-transparent`} />

                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 lg:px-20 text-white space-y-2 md:space-y-4 max-w-2xl">
                                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight animate-in fade-in slide-in-from-left-4 duration-500">
                                        {slide.title}
                                    </h2>
                                    <p className="text-sm md:text-lg lg:text-xl text-white/90 font-medium max-w-lg mb-4 animate-in fade-in slide-in-from-left-5 duration-700 delay-100">
                                        {slide.subtitle}
                                    </p>

                                    <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                                        <Button
                                            onClick={() => navigate(slide.link)}
                                            size="lg"
                                            className="bg-white text-black hover:bg-white/90 font-bold border-none transition-all hover:scale-105 active:scale-95"
                                        >
                                            {slide.cta}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <div className="hidden group-hover:block transition-opacity">
                    <CarouselPrevious className="left-4 bg-black/20 text-white border-white/20 hover:bg-black/40 hover:text-white" />
                    <CarouselNext className="right-4 bg-black/20 text-white border-white/20 hover:bg-black/40 hover:text-white" />
                </div>
            </Carousel>
        </div>
    )
}
