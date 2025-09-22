import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, BarChart, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Logo } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const heroImage = PlaceHolderImages.find((img) => img.id === "hero-image");
const featureImages = [
  PlaceHolderImages.find((img) => img.id === "feature-recording"),
  PlaceHolderImages.find((img) => img.id === "feature-feedback"),
  PlaceHolderImages.find((img) => img.id === "feature-progress"),
].filter(Boolean) as typeof PlaceHolderImages;

const features = [
  {
    icon: <Video className="h-8 w-8 text-primary" />,
    title: "Proctored Recordings",
    description: "Simulate real interview pressure with timed, recorded sessions and device monitoring.",
    image: featureImages[0],
  },
  {
    icon: <Bot className="h-8 w-8 text-primary" />,
    title: "AI-Powered Feedback",
    description: "Receive instant, detailed feedback on your performance, covering everything from grammar to overall impact.",
    image: featureImages[1],
  },
  {
    icon: <BarChart className="h-8 w-8 text-primary" />,
    title: "Track Your Progress",
    description: "Review past attempts, analyze your growth, and identify patterns in your performance over time.",
    image: featureImages[2],
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-headline text-xl font-bold">
            <Logo className="h-8 w-8 text-primary" />
            <span>precasprep</span>
          </Link>
          <nav>
            <Button asChild variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild className="ml-2">
              <Link href="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="max-w-xl">
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                The Future of Interview Preparation is Here.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                precasprep uses AI to provide you with realistic interview practice and actionable feedback, helping you land your dream job with confidence.
              </p>
              <div className="mt-8 flex gap-4">
                <Button asChild size="lg">
                  <Link href="/signup">
                    Start Your Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#features">Learn More</Link>
                </Button>
              </div>
            </div>
            <div>
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  width={1200}
                  height={800}
                  className="rounded-xl shadow-2xl"
                  data-ai-hint={heroImage.imageHint}
                  priority
                />
              )}
            </div>
          </div>
        </section>

        <section id="features" className="bg-secondary py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
                Everything You Need to Succeed
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Our platform is designed to give you a competitive edge in any interview scenario.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="overflow-hidden transition-transform hover:scale-105 hover:shadow-xl">
                  {feature.image && (
                    <Image
                      src={feature.image.imageUrl}
                      alt={feature.image.description}
                      width={600}
                      height={400}
                      className="h-48 w-full object-cover"
                      data-ai-hint={feature.image.imageHint}
                    />
                  )}
                  <CardHeader>
                    <div className="mb-4 flex items-center gap-4">
                      {feature.icon}
                      <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} precasprep. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
